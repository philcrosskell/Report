import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as AnyRecord
    const { businessName, suburb } = body as { businessName: string; suburb: string }
    if (!businessName || !suburb) {
      return NextResponse.json({ success: false, error: 'Business name and suburb are required' }, { status: 400 })
    }

    const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
    if (!PLACES_KEY) return NextResponse.json({ success: false, error: 'Google Places API key not configured' }, { status: 500 })

    // Step 1: Find place_id via Text Search
    const searchQuery = encodeURIComponent(businessName + ' ' + suburb + ' Australia')
    const searchRes = await fetch(
      'https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + searchQuery + '&key=' + PLACES_KEY
    )
    const searchData = await searchRes.json() as AnyRecord
    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ success: false, error: 'Business not found in Google Places — check the name and suburb' }, { status: 404 })
    }
    const place = searchData.results[0] as AnyRecord
    const placeId = place.place_id as string

    // Step 2: Get full place details
    const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,business_status,editorial_summary,reviews,price_level,serves_beer,serves_wine,wheelchair_accessible_entrance,reservable,delivery,dine_in,takeout,serves_breakfast,serves_lunch,serves_dinner'
    const detailRes = await fetch(
      'https://maps.googleapis.com/maps/api/place/details/json?place_id=' + placeId + '&fields=' + fields + '&key=' + PLACES_KEY
    )
    const detailData = await detailRes.json() as AnyRecord
    const p = (detailData.result ?? {}) as AnyRecord

    // Extract structured data from Places API
    const name = (p.name ?? businessName) as string
    const address = (p.formatted_address ?? '') as string
    const phone = (p.formatted_phone_number ?? null) as string | null
    const website = (p.website ?? null) as string | null
    const rating = (p.rating ?? null) as number | null
    const reviewCount = (p.user_ratings_total ?? 0) as number
    const hours = p.opening_hours as AnyRecord | null
    const hoursSet = !!(hours && hours.weekday_text && hours.weekday_text.length > 0)
    const allDaysSet = hoursSet && (hours.weekday_text as string[]).length >= 7
    const photoCount = p.photos ? (p.photos as unknown[]).length : 0
    const hasCoverPhoto = photoCount > 0
    const hasDescription = !!(p.editorial_summary && (p.editorial_summary as AnyRecord).overview)
    // Reviews — check for owner responses
    const reviews = (p.reviews ?? []) as AnyRecord[]
    const ownerReplied = reviews.some((rev: AnyRecord) => !!(rev.owner_response && (rev.owner_response as AnyRecord).text))
    const hasRecentReviews = reviews.length > 0
    const category = p.types ? (p.types as string[])[0].replace(/_/g, ' ') : ''
    const isOpen = p.business_status === 'OPERATIONAL'

    // Step 3: Ask Claude for qualitative analysis using the real data
    const client = new Anthropic()
    const realDataSummary = [
      'Business: ' + name,
      'Address: ' + address,
      'Phone: ' + (phone ?? 'not listed'),
      'Website: ' + (website ?? 'not listed'),
      'Rating: ' + (rating != null ? rating + '/5' : 'not found'),
      'Review count: ' + reviewCount,
      'Hours configured: ' + (hoursSet ? 'yes — ' + (hours.weekday_text as string[]).join(', ') : 'no'),
      'Photos: ' + photoCount,
      'Description: ' + (hasDescription ? (p.editorial_summary as AnyRecord).overview : 'NOT in editorial_summary — may exist as business description in GBP but not returned by Places API'),
      'Owner responds to reviews: ' + (ownerReplied ? 'YES — seen in Places API reviews' : 'not confirmed from Places API data'),
      'Recent reviews sample: ' + (reviews.length > 0 ? reviews.slice(0, 2).map((r: AnyRecord) => r.text as string).join(' | ') : 'none'),
      'Category: ' + category,
      'Business status: ' + (isOpen ? 'operational' : p.business_status ?? 'unknown'),
    ].join('\n')

    const aiRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You are a Google Business Profile consultant. Given real GBP data, provide qualitative analysis. Output ONLY raw JSON — no markdown.',
      messages: [{
        role: 'user',
        content: 'Here is the verified GBP data for this business:\n\n' + realDataSummary + '\n\nBased on this data, return ONLY this JSON:\n{"hasRecentReviews":true,"unansweredReviews":0,"ownerRespondsToReviews":true,"holidayHoursSet":false,"hasRecentPhotos":false,"hasRecentPosts":false,"lastPostDaysAgo":null,"appointmentLink":false,"servicesListed":true,"serviceAreaSet":false,"attributesSet":false,"descriptionUsesKeywords":true,"descriptionMentionsServiceArea":false,"hasLogo":true,"issues":["specific issue 1","specific issue 2"],"wins":["specific win 1","specific win 2"],"pitchSummary":"Hi [Name], I noticed...","notFound":false}\n\nRules:\n- issues and wins must be SPECIFIC to this business, not generic\n- If reviewCount > 0, hasRecentReviews is likely true\n- pitchSummary must be a real personalised cold outreach message referencing specific things you see in their data\n- hasLogo: true if they have photos (cover photo serves as logo signal)\n- serviceAreaSet: true only if service area is explicitly visible on GBP'
      }]
    })

    const aiText = aiRes.content.filter(b => b.type === 'text').map(b => (b as AnyRecord).text as string).join('').trim()
    const aiStart = aiText.indexOf('{')
    const aiEnd = aiText.lastIndexOf('}')
    const aiData = aiStart !== -1 && aiEnd > aiStart ? JSON.parse(aiText.substring(aiStart, aiEnd + 1)) as AnyRecord : {}

    // Merge Places API facts with AI qualitative analysis
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
      hasRecentReviews: hasRecentReviews || reviewCount > 0 || (aiData.hasRecentReviews ?? false),
      unansweredReviews: aiData.unansweredReviews ?? 0,
      ownerRespondsToReviews: ownerReplied || (aiData.ownerRespondsToReviews ?? false),
      hoursSet,
      allDaysSet,
      holidayHoursSet: aiData.holidayHoursSet ?? false,
      hasDescription,
      descriptionUsesKeywords: aiData.descriptionUsesKeywords ?? hasDescription,
      descriptionMentionsServiceArea: aiData.descriptionMentionsServiceArea ?? false,
      hasLogo: photoCount > 0,
      hasCoverPhoto,
      photoCount,
      hasRecentPhotos: aiData.hasRecentPhotos ?? (photoCount > 0),
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
    }

    return NextResponse.json({ success: true, data: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
