import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ connected: false, hasRefreshToken: false })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as AnyRecord
    const { businessName, suburb } = body as { businessName: string; suburb: string }
    if (!businessName || !suburb) {
      return NextResponse.json({ success: false, error: 'Business name and suburb are required' }, { status: 400 })
    }

    const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
    if (!PLACES_KEY) return NextResponse.json({ success: false, error: 'Google Places API key not configured' }, { status: 500 })

    // ── Step 1: Places Text Search ───────────────────────────────────────────
    const searchQuery = encodeURIComponent(businessName + ' ' + suburb + ' Australia')
    const searchRes = await fetch('https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + searchQuery + '&key=' + PLACES_KEY)
    const searchData = await searchRes.json() as AnyRecord
    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ success: false, error: 'Business not found in Google — check the name and suburb' }, { status: 404 })
    }
    const place = searchData.results[0] as AnyRecord
    const placeId = place.place_id as string

    // ── Step 2: Places Details ───────────────────────────────────────────────
    const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,business_status,editorial_summary,reviews,price_level,serves_beer,serves_wine,reservable,delivery,dine_in,takeout'
    const detailRes = await fetch('https://maps.googleapis.com/maps/api/place/details/json?place_id=' + placeId + '&fields=' + fields + '&key=' + PLACES_KEY)
    const detailData = await detailRes.json() as AnyRecord
    const p = (detailData.result ?? {}) as AnyRecord

    // Extract all available facts from Places API
    const name = (p.name ?? businessName) as string
    const address = (p.formatted_address ?? '') as string
    const phone = (p.formatted_phone_number ?? null) as string | null
    const website = (p.website ?? null) as string | null
    const rating = (p.rating ?? null) as number | null
    const reviewCount = (p.user_ratings_total ?? 0) as number
    const hours = p.opening_hours as AnyRecord | null
    const hoursSet = !!(hours && hours.weekday_text && (hours.weekday_text as string[]).length > 0)
    const allDaysSet = !!(hours && (hours.weekday_text as string[])?.length >= 7)
    const photoCount = p.photos ? (p.photos as unknown[]).length : 0
    const hasDescription = !!(p.editorial_summary && (p.editorial_summary as AnyRecord).overview)
    const description = hasDescription ? ((p.editorial_summary as AnyRecord).overview as string) : ''
    const category = p.types ? (p.types as string[])[0].replace(/_/g, ' ') : ''
    const reviews = (p.reviews ?? []) as AnyRecord[]
    const ownerReplied = reviews.some((r: AnyRecord) => !!(r.owner_response && (r.owner_response as AnyRecord).text))

    // ── Step 3: Claude web search for the 3 fields Places cannot provide ─────
    // Posts, service area, owner response confirmation
    const client = new Anthropic()
    const searchName = businessName.replace(/[=+&@#%^*<>]/g, ' ').replace(/\s+/g, ' ').trim()

    const aiRes = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a Google Business Profile analyst. Search for specific signals and return ONLY raw JSON.',
      messages: [{
        role: 'user',
        content: 'Search Google for "' + searchName + ' ' + suburb + '" and "' + searchName + ' ' + suburb + ' Google reviews". Answer these specific questions about their Google Business Profile:\n\n1. Do they have Google Posts? (look for recent posts in search results)\n2. Is their service area configured? (do they appear for multiple suburb searches, or does their listing show a service area)\n3. Do they respond to Google reviews? (look for "Response from the owner" text)\n\nAlso write specific issues and wins based on what you find.\n\nHere is their verified Places API data:\n- Rating: ' + (rating ?? 'not found') + ' stars\n- Reviews: ' + reviewCount + '\n- Hours set: ' + hoursSet + '\n- Photos: ' + photoCount + '\n- Description: ' + (description || 'none found in Places API') + '\n- Owner response detected by Places API: ' + ownerReplied + '\n\nReturn ONLY this JSON:\n{"hasRecentPosts":false,"lastPostDaysAgo":null,"serviceAreaSet":false,"ownerRespondsToReviews":false,"holidayHoursSet":false,"appointmentLink":false,"servicesListed":true,"attributesSet":false,"descriptionUsesKeywords":true,"descriptionMentionsServiceArea":false,"hasLogo":true,"issues":["specific issue"],"wins":["specific win"],"pitchSummary":"personalised outreach","notFound":false}'
      }]
    })

    const aiText = (aiRes.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()
    const aiStart = aiText.indexOf('{')
    const aiEnd = aiText.lastIndexOf('}')
    const aiData = aiStart !== -1 && aiEnd > aiStart ? JSON.parse(aiText.substring(aiStart, aiEnd + 1)) as AnyRecord : {}

    const result: AnyRecord = {
      businessName: name,
      address,
      suburb,
      phone,
      website,
      category,
      secondaryCategories: p.types ? (p.types as string[]).slice(1, 4).map((t: string) => t.replace(/_/g, ' ')) : [],
      rating,
      reviewCount,
      hasRecentReviews: reviews.length > 0 || reviewCount > 0,
      unansweredReviews: aiData.unansweredReviews ?? 0,
      ownerRespondsToReviews: ownerReplied || (aiData.ownerRespondsToReviews ?? false),
      hoursSet,
      allDaysSet,
      holidayHoursSet: aiData.holidayHoursSet ?? false,
      hasDescription: hasDescription || !!(aiData.hasDescription),
      descriptionUsesKeywords: aiData.descriptionUsesKeywords ?? hasDescription,
      descriptionMentionsServiceArea: aiData.descriptionMentionsServiceArea ?? false,
      hasLogo: photoCount > 0,
      hasCoverPhoto: photoCount > 0,
      photoCount,
      hasRecentPhotos: photoCount > 0,
      hasRecentPosts: aiData.hasRecentPosts ?? false,
      lastPostDaysAgo: aiData.lastPostDaysAgo ?? null,
      appointmentLink: aiData.appointmentLink ?? false,
      servicesListed: aiData.servicesListed ?? false,
      serviceAreaSet: aiData.serviceAreaSet ?? false,
      attributesSet: aiData.attributesSet ?? false,
      issues: aiData.issues ?? [],
      wins: aiData.wins ?? [],
      pitchSummary: aiData.pitchSummary ?? '',
      notFound: false,
      dataSource: 'places_api',
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
