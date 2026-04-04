import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ connected: false })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as AnyRecord
    const { businessName, suburb, manualPosts, manualOwnerResponds, manualServiceArea, manualDescription } = body as { businessName: string; suburb: string; manualPosts?: boolean; manualOwnerResponds?: boolean; manualServiceArea?: boolean; manualDescription?: boolean }
    if (!businessName || !suburb) {
      return NextResponse.json({ success: false, error: 'Business name and suburb are required' }, { status: 400 })
    }

    const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''

    // Step 1: Places API for accurate structured data
    let placesData: AnyRecord = {}
    if (PLACES_KEY) {
      const searchQuery = encodeURIComponent(businessName + ' ' + suburb + ' Australia')
      const searchRes = await fetch('https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + searchQuery + '&key=' + PLACES_KEY)
      const searchData = await searchRes.json() as AnyRecord
      if (searchData.results?.length) {
        const placeId = (searchData.results[0] as AnyRecord).place_id as string
        const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,editorial_summary,reviews'
        const detailRes = await fetch('https://maps.googleapis.com/maps/api/place/details/json?place_id=' + placeId + '&fields=' + fields + '&key=' + PLACES_KEY)
        const p = ((await detailRes.json() as AnyRecord).result ?? {}) as AnyRecord
        const reviews = (p.reviews ?? []) as AnyRecord[]
        const hours = p.opening_hours as AnyRecord | null
        const photoCount = p.photos ? (p.photos as unknown[]).length : 0
        placesData = {
          businessName: (p.name ?? businessName) as string,
          address: (p.formatted_address ?? '') as string,
          phone: (p.formatted_phone_number ?? null) as string | null,
          website: (p.website ?? null) as string | null,
          category: p.types ? (p.types as string[])[0].replace(/_/g,' ') : '',
          secondaryCategories: p.types ? (p.types as string[]).slice(1,4).map((t:string) => t.replace(/_/g,' ')) : [],
          rating: (p.rating ?? null) as number | null,
          reviewCount: (p.user_ratings_total ?? 0) as number,
          hoursSet: !!(hours?.weekday_text?.length),
          allDaysSet: !!(hours?.weekday_text?.length >= 7),
          hasRecentReviews: reviews.length > 0 || (p.user_ratings_total ?? 0) > 0,
          photoCount, hasCoverPhoto: photoCount > 0, hasLogo: photoCount > 0, hasRecentPhotos: photoCount > 0,
          placesOwnerReplied: reviews.some((r:AnyRecord) => !!(r.owner_response?.text)),
        }
      }
    }

    // Step 2: Claude web search — fetch the Maps page for fields Places cannot provide
    const client = new Anthropic()
    const searchName = businessName.replace(/[=+&@#%^*<>]/g,' ').replace(/\s+/g,' ').trim()
    const mapsSearchUrl = 'https://www.google.com/maps/search/' + encodeURIComponent(searchName + ' ' + suburb)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchRes2 = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: `You are a Google Business Profile analyst. Your job is to extract SPECIFIC data points from Google Maps search results. Be precise and literal — only report what you actually see in the search results. Output ONLY raw JSON.`,
      messages: [{
        role: 'user',
        content: `Search for this exact business on Google Maps: "${searchName} ${suburb} Australia"

Also search: "${searchName} ${suburb} Google reviews"

Extract these SPECIFIC facts from what you find in the search results:

1. hasRecentPosts: Did you see any "From the owner" posts, Google Posts, or "Updates" section? (true/false)
2. lastPostDaysAgo: If posts found, approximately how many days ago was the most recent one? (number or null)
3. serviceAreaSet: Did you see a "Service area" section, or does the listing show it serves multiple suburbs/regions beyond just the street address? (true/false)
4. ownerRespondsToReviews: Did you see any text saying "Response from the owner" or "Owner response"? (true/false)
5. hasDescription: Did you see a business description / "From the owner" description section? (true/false)
6. description: The actual description text if found (string or null)
7. appointmentLink: Did you see a "Book", "Reserve", or "Schedule" button/link? (true/false)
8. servicesListed: Did you see a "Services" section listing specific services? (true/false)
9. holidayHoursSet: Did you see special/holiday hours configured? (true/false)
10. issues: List 3-5 SPECIFIC issues you found with this GBP listing
11. wins: List 2-4 SPECIFIC wins/strengths you found
12. pitchSummary: Write a personalised cold outreach message referencing specific things you found

Places API already confirmed: rating=${placesData.rating ?? 'unknown'}, reviews=${placesData.reviewCount ?? 0}, hours=${placesData.hoursSet ? 'set' : 'missing'}, photos=${placesData.photoCount ?? 0}

Return ONLY this JSON (no markdown):
{"hasRecentPosts":false,"lastPostDaysAgo":null,"serviceAreaSet":false,"ownerRespondsToReviews":false,"hasDescription":false,"description":null,"appointmentLink":false,"servicesListed":false,"holidayHoursSet":false,"unansweredReviews":0,"issues":[],"wins":[],"pitchSummary":"","notFound":false}`
      }]
    })

    const aiText = (searchRes2.content as AnyRecord[])
      .filter((b:AnyRecord) => b.type === 'text')
      .map((b:AnyRecord) => b.text as string)
      .join('').trim()
    const s = aiText.indexOf('{'), e2 = aiText.lastIndexOf('}')
    const aiData = s !== -1 && e2 > s ? JSON.parse(aiText.substring(s, e2+1)) as AnyRecord : {}

    const result: AnyRecord = {
      suburb,
      ...placesData,
      hasDescription: !!(aiData.hasDescription) || !!(aiData.description) || !!(placesData.editorial_summary),
      descriptionUsesKeywords: !!(aiData.hasDescription),
      descriptionMentionsServiceArea: false,
      hasRecentPosts: aiData.hasRecentPosts ?? false,
      lastPostDaysAgo: aiData.lastPostDaysAgo ?? null,
      serviceAreaSet: aiData.serviceAreaSet ?? false,
      ownerRespondsToReviews: !!(placesData.placesOwnerReplied) || !!(aiData.ownerRespondsToReviews),
      unansweredReviews: aiData.unansweredReviews ?? 0,
      holidayHoursSet: aiData.holidayHoursSet ?? false,
      appointmentLink: aiData.appointmentLink ?? false,
      servicesListed: aiData.servicesListed ?? false,
      attributesSet: false,
      issues: aiData.issues ?? [],
      wins: aiData.wins ?? [],
      pitchSummary: aiData.pitchSummary ?? '',
      notFound: aiData.notFound ?? false,
      dataSource: 'places_api+web_search',
    }

    // Apply manual user confirmations — user knows their GBP better than any scraper
    if (manualPosts) result.hasRecentPosts = true
    if (manualOwnerResponds) { result.ownerRespondsToReviews = true; result.unansweredReviews = 0 }
    if (manualServiceArea) result.serviceAreaSet = true
    if (manualDescription) result.hasDescription = true

    // Filter issues that contradict manual confirmations
    if (Array.isArray(result.issues)) {
      result.issues = (result.issues as string[]).filter((issue: string) => {
        const t = issue.toLowerCase()
        if (manualPosts && (t.includes('post') || t.includes('update'))) return false
        if (manualOwnerResponds && (t.includes('owner') || t.includes('respond') || t.includes('unanswer') || t.includes('review') && t.includes('no '))) return false
        if (manualServiceArea && (t.includes('service area') || t.includes('service region'))) return false
        if (manualDescription && (t.includes('description') || t.includes('from the owner'))) return false
        return true
      })
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
