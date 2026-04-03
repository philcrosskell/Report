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
    const { businessName, suburb, clientHtml } = body as { businessName: string; suburb: string; clientHtml?: string }
    if (!businessName || !suburb) {
      return NextResponse.json({ success: false, error: 'Business name and suburb are required' }, { status: 400 })
    }

    let scraped: AnyRecord = {}

    if (clientHtml && clientHtml.length > 300) {
      const t = clientHtml
      const ratingMatch = t.match(/(\d+\.\d+)\s*\((\d+)\)/)
      const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null
      const reviewCount = ratingMatch ? parseInt(ratingMatch[2]) : 0
      const hoursSet = /Opens|Closes|Open\s*[\u00b7\u2022]|Closed\s*[\u00b7\u2022]/i.test(t)
      const allDaysSet = /Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/i.test(t)
      const holidayHoursSet = /holiday|special hours/i.test(t)
      const hasCoverPhoto = /See photos|photos?/i.test(t)
      const photoMatch = t.match(/(\d+)\s*photos?/i)
      const photoCount = photoMatch ? parseInt(photoMatch[1]) : (hasCoverPhoto ? 1 : 0)
      const hasRecentPosts = t.includes('From the owner') || t.includes('Updates from')
      const ownerRespondsToReviews = t.includes('Response from the owner') || t.includes('Owner response')
      const hasDescription = t.includes('From the owner') || /About[\s\S]{0,30}[A-Z][a-z]{3}/i.test(t)
      const serviceAreaSet = t.includes('Service area') || t.includes('Serves:') || /service\s+region/i.test(t)
      const appointmentLink = /Book\s+online|Book\s+appointment|Reserve|Schedule/i.test(t)
      const servicesListed = t.includes('Services:') || /service\s+list/i.test(t)
      const addressMatch = t.match(/(\d+[^,\n]+(?:St|Ave|Rd|Dr|Blvd|Way|Ln|Pl|Ct|Cres|Pde)[^\n,]*,?[^\n]{0,50}(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s*\d{4})/i)
      const phoneMatch = t.match(/(?:\+61|0)[\d\s]{8,14}/)
      const categoryMatch = t.match(/(?:\d+\.\d+)\s*(?:\(\d+\))\s*([^\n|\u2022]{3,50})/)

      scraped = {
        businessName,
        address: addressMatch ? addressMatch[1].trim() : '',
        phone: phoneMatch ? phoneMatch[0].trim() : null,
        website: null,
        category: categoryMatch ? categoryMatch[1].trim() : '',
        rating, reviewCount,
        hoursSet, allDaysSet, holidayHoursSet,
        hasCoverPhoto, hasLogo: hasCoverPhoto, photoCount, hasRecentPhotos: photoCount > 0,
        hasRecentPosts, lastPostDaysAgo: null,
        ownerRespondsToReviews, unansweredReviews: 0,
        hasRecentReviews: reviewCount > 0,
        hasDescription, serviceAreaSet, servicesListed, appointmentLink,
        dataSource: 'client_scrape',
      }
    } else {
      const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''
      if (!PLACES_KEY) return NextResponse.json({ success: false, error: 'No data source available' }, { status: 500 })
      const searchQuery = encodeURIComponent(businessName + ' ' + suburb + ' Australia')
      const searchRes = await fetch('https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + searchQuery + '&key=' + PLACES_KEY)
      const searchData = await searchRes.json() as AnyRecord
      if (!searchData.results?.length) return NextResponse.json({ success: false, error: 'Business not found in Google — check name and suburb' }, { status: 404 })
      const placeId = (searchData.results[0] as AnyRecord).place_id as string
      const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,editorial_summary,reviews'
      const detailRes = await fetch('https://maps.googleapis.com/maps/api/place/details/json?place_id=' + placeId + '&fields=' + fields + '&key=' + PLACES_KEY)
      const p = ((await detailRes.json() as AnyRecord).result ?? {}) as AnyRecord
      const reviews = (p.reviews ?? []) as AnyRecord[]
      const hours = p.opening_hours as AnyRecord | null
      const photoCount = p.photos ? (p.photos as unknown[]).length : 0
      scraped = {
        businessName: (p.name ?? businessName) as string,
        address: (p.formatted_address ?? '') as string,
        phone: (p.formatted_phone_number ?? null) as string | null,
        website: (p.website ?? null) as string | null,
        category: p.types ? (p.types as string[])[0].replace(/_/g,' ') : '',
        rating: (p.rating ?? null) as number | null,
        reviewCount: (p.user_ratings_total ?? 0) as number,
        hoursSet: !!(hours?.weekday_text?.length), allDaysSet: !!(hours?.weekday_text?.length >= 7), holidayHoursSet: false,
        hasCoverPhoto: photoCount > 0, hasLogo: photoCount > 0, photoCount, hasRecentPhotos: photoCount > 0,
        hasRecentPosts: false, lastPostDaysAgo: null,
        ownerRespondsToReviews: reviews.some((r: AnyRecord) => !!(r.owner_response?.text)), unansweredReviews: 0,
        hasRecentReviews: reviews.length > 0 || (p.user_ratings_total ?? 0) > 0,
        hasDescription: !!(p.editorial_summary?.overview),
        serviceAreaSet: false, servicesListed: false, appointmentLink: false,
        dataSource: 'places_api',
      }
    }

    const client = new Anthropic()
    const summary = Object.entries(scraped).map(e => e[0] + ': ' + e[1]).join('\n')
    const aiRes = await client.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1200,
      system: 'GBP consultant. Given verified data, write specific issues/wins/pitch. ONLY raw JSON.',
      messages: [{ role: 'user', content: 'Verified GBP data:\n' + summary + '\n\nReturn ONLY:\n{"descriptionUsesKeywords":true,"descriptionMentionsServiceArea":false,"secondaryCategories":[],"issues":["specific issue"],"wins":["specific win"],"pitchSummary":"personalised outreach","notFound":false}\n\nIssues and wins must be SPECIFIC to this business. Pitch must name the business and reference specific gaps found.' }]
    })
    const aiText = aiRes.content.filter(b => b.type === 'text').map(b => (b as AnyRecord).text as string).join('').trim()
    const s = aiText.indexOf('{'), e2 = aiText.lastIndexOf('}')
    const aiData = s !== -1 && e2 > s ? JSON.parse(aiText.substring(s, e2 + 1)) as AnyRecord : {}

    return NextResponse.json({ success: true, data: { suburb, ...scraped, ...aiData } })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Error' }, { status: 500 })
  }
}
