import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }).toString(),
  })
  const data = await res.json() as AnyRecord
  return (data.access_token as string) ?? null
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  // Check if user has a valid token
  const accessToken = request.cookies.get('gbp_access_token')?.value
  const refreshToken = request.cookies.get('gbp_refresh_token')?.value
  return NextResponse.json({
    connected: !!(accessToken || refreshToken),
    hasRefreshToken: !!refreshToken,
  })
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as AnyRecord
    const { businessName, suburb } = body as { businessName: string; suburb: string }
    if (!businessName || !suburb) {
      return NextResponse.json({ success: false, error: 'Business name and suburb are required' }, { status: 400 })
    }

    // Get access token from cookie
    let accessToken = request.cookies.get('gbp_access_token')?.value
    const refreshToken = request.cookies.get('gbp_refresh_token')?.value

    // Try refresh if no access token
    if (!accessToken && refreshToken) {
      accessToken = await refreshAccessToken(refreshToken) ?? undefined
    }

    // Fall back to Places API if not authenticated
    const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY ?? ''

    let placesData: AnyRecord = {}
    let accountName = ''
    let locationName = ''

    if (accessToken) {
      // ── Business Profile API path ────────────────────────────────────────
      // Step 1: List accounts
      const accountsRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', {
        headers: { Authorization: 'Bearer ' + accessToken }
      })
      const accountsData = await accountsRes.json() as AnyRecord
      const accounts = (accountsData.accounts ?? []) as AnyRecord[]
      if (accounts.length === 0) {
        return NextResponse.json({ success: false, error: 'No Google Business Profile accounts found for this Google account' }, { status: 404 })
      }
      accountName = (accounts[0].name as string) ?? ''

      // Step 2: Search for the location
      const locationsRes = await fetch(
        'https://mybusinessbusinessinformation.googleapis.com/v1/' + accountName + '/locations?readMask=name,title,phoneNumbers,categories,storefrontAddress,websiteUri,regularHours,specialHours,profile,relationshipData,metadata',
        { headers: { Authorization: 'Bearer ' + accessToken } }
      )
      const locationsData = await locationsRes.json() as AnyRecord
      const locations = (locationsData.locations ?? []) as AnyRecord[]

      // Find best matching location
      const searchLower = businessName.toLowerCase()
      const matched = locations.find((loc: AnyRecord) => {
        const title = ((loc.title as string) ?? '').toLowerCase()
        return title.includes(searchLower.split(' ')[0]) || searchLower.includes(title.split(' ')[0])
      }) ?? locations[0]

      if (!matched) {
        return NextResponse.json({ success: false, error: 'Location not found in your Business Profile account' }, { status: 404 })
      }
      locationName = (matched.name as string) ?? ''

      // Step 3: Get reviews
      const reviewsRes = await fetch(
        'https://mybusiness.googleapis.com/v4/' + locationName + '/reviews?pageSize=50',
        { headers: { Authorization: 'Bearer ' + accessToken } }
      )
      const reviewsData = await reviewsRes.json() as AnyRecord
      const reviews = (reviewsData.reviews ?? []) as AnyRecord[]
      const ownerReplied = reviews.some((r: AnyRecord) => !!(r.reviewReply && (r.reviewReply as AnyRecord).comment))
      const unansweredCount = reviews.filter((r: AnyRecord) => !(r.reviewReply && (r.reviewReply as AnyRecord).comment)).length

      // Step 4: Get posts
      const postsRes = await fetch(
        'https://mybusiness.googleapis.com/v4/' + locationName + '/localPosts?pageSize=10',
        { headers: { Authorization: 'Bearer ' + accessToken } }
      )
      const postsData = await postsRes.json() as AnyRecord
      const posts = (postsData.localPosts ?? []) as AnyRecord[]
      const hasRecentPosts = posts.length > 0
      let lastPostDaysAgo: number | null = null
      if (posts.length > 0) {
        const lastPost = posts[0]
        const createTime = (lastPost.createTime as string) ?? (lastPost.updateTime as string)
        if (createTime) {
          lastPostDaysAgo = Math.floor((Date.now() - new Date(createTime).getTime()) / (1000 * 60 * 60 * 24))
        }
      }

      // Step 5: Get photos count
      const photosRes = await fetch(
        'https://mybusiness.googleapis.com/v4/' + locationName + '/media?pageSize=100',
        { headers: { Authorization: 'Bearer ' + accessToken } }
      )
      const photosData = await photosRes.json() as AnyRecord
      const photoCount = ((photosData.mediaItems ?? []) as unknown[]).length

      // Build placesData from Business Profile API
      const hours = (matched.regularHours ?? {}) as AnyRecord
      const periods = (hours.periods ?? []) as unknown[]
      const hoursSet = periods.length > 0
      const profile = (matched.profile ?? {}) as AnyRecord
      const hasDescription = !!((profile.description as string) ?? '')
      const phone = (matched.phoneNumbers as AnyRecord)?.primaryPhone ?? null
      const address = matched.storefrontAddress
        ? [
            (matched.storefrontAddress as AnyRecord).addressLines,
            (matched.storefrontAddress as AnyRecord).locality,
            (matched.storefrontAddress as AnyRecord).administrativeArea,
            (matched.storefrontAddress as AnyRecord).postalCode,
          ].flat().filter(Boolean).join(', ')
        : ''
      const category = (matched.categories as AnyRecord)?.primaryCategory?.displayName ?? ''
      const metadata = (matched.metadata ?? {}) as AnyRecord

      placesData = {
        businessName: (matched.title as string) ?? businessName,
        address,
        phone,
        website: (matched.websiteUri as string) ?? null,
        rating: (metadata.averageRating as number) ?? null,
        reviewCount: (metadata.totalReviewCount as number) ?? reviews.length,
        category,
        hoursSet,
        allDaysSet: periods.length >= 7,
        hasDescription,
        description: (profile.description as string) ?? '',
        photoCount,
        hasCoverPhoto: photoCount > 0,
        hasLogo: photoCount > 0,
        ownerRespondsToReviews: ownerReplied,
        unansweredReviews: unansweredCount,
        hasRecentReviews: reviews.length > 0,
        hasRecentPosts,
        lastPostDaysAgo,
        serviceAreaSet: !!(matched.serviceArea),
        servicesListed: !!(matched.profile),
        attributesSet: false,
      }
    } else if (PLACES_KEY) {
      // ── Places API fallback ──────────────────────────────────────────────
      const searchQuery = encodeURIComponent(businessName + ' ' + suburb + ' Australia')
      const searchRes = await fetch('https://maps.googleapis.com/maps/api/place/textsearch/json?query=' + searchQuery + '&key=' + PLACES_KEY)
      const searchData = await searchRes.json() as AnyRecord
      if (!searchData.results || searchData.results.length === 0) {
        return NextResponse.json({ success: false, error: 'Business not found — try connecting your Google account for accurate results' }, { status: 404 })
      }
      const place = searchData.results[0] as AnyRecord
      const fields = 'name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,photos,types,business_status,editorial_summary,reviews,price_level'
      const detailRes = await fetch('https://maps.googleapis.com/maps/api/place/details/json?place_id=' + (place.place_id as string) + '&fields=' + fields + '&key=' + PLACES_KEY)
      const detailData = await detailRes.json() as AnyRecord
      const p = (detailData.result ?? {}) as AnyRecord
      const reviews = (p.reviews ?? []) as AnyRecord[]
      const ownerReplied = reviews.some((r: AnyRecord) => !!(r.owner_response && (r.owner_response as AnyRecord).text))
      const photoCount = p.photos ? (p.photos as unknown[]).length : 0
      const hours = p.opening_hours as AnyRecord | null
      placesData = {
        businessName: (p.name ?? businessName) as string,
        address: (p.formatted_address ?? '') as string,
        phone: (p.formatted_phone_number ?? null) as string | null,
        website: (p.website ?? null) as string | null,
        rating: (p.rating ?? null) as number | null,
        reviewCount: (p.user_ratings_total ?? 0) as number,
        category: p.types ? (p.types as string[])[0].replace(/_/g,' ') : '',
        hoursSet: !!(hours && hours.weekday_text && (hours.weekday_text as string[]).length > 0),
        allDaysSet: !!(hours && (hours.weekday_text as string[])?.length >= 7),
        hasDescription: !!(p.editorial_summary && (p.editorial_summary as AnyRecord).overview),
        description: p.editorial_summary ? ((p.editorial_summary as AnyRecord).overview as string) : '',
        photoCount,
        hasCoverPhoto: photoCount > 0,
        hasLogo: photoCount > 0,
        ownerRespondsToReviews: ownerReplied,
        unansweredReviews: 0,
        hasRecentReviews: reviews.length > 0,
        hasRecentPosts: false,
        lastPostDaysAgo: null,
        serviceAreaSet: false,
        servicesListed: false,
        attributesSet: false,
      }
    } else {
      return NextResponse.json({ success: false, error: 'No authentication available. Please connect your Google account.' }, { status: 401 })
    }

    // ── Claude qualitative analysis ──────────────────────────────────────
    const client = new Anthropic()
    const summary = [
      'Business: ' + placesData.businessName,
      'Address: ' + placesData.address,
      'Rating: ' + (placesData.rating != null ? placesData.rating + '/5' : 'not found'),
      'Reviews: ' + placesData.reviewCount,
      'Owner responds to reviews: ' + placesData.ownerRespondsToReviews,
      'Unanswered reviews: ' + placesData.unansweredReviews,
      'Hours set: ' + placesData.hoursSet,
      'Photos: ' + placesData.photoCount,
      'Has description: ' + placesData.hasDescription,
      'Description: ' + (placesData.description || 'none'),
      'Recent posts: ' + placesData.hasRecentPosts + (placesData.lastPostDaysAgo != null ? ' (last: ' + placesData.lastPostDaysAgo + ' days ago)' : ''),
      'Service area set: ' + placesData.serviceAreaSet,
      'Data source: ' + (accessToken ? 'Business Profile API (authenticated — fully accurate)' : 'Places API (partial data)'),
    ].join('\n')

    const aiRes = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: 'You are a Google Business Profile consultant. Given real verified GBP data, write specific actionable issues and wins. Output ONLY raw JSON.',
      messages: [{
        role: 'user',
        content: 'Real GBP data:\n\n' + summary + '\n\nReturn ONLY:\n{"holidayHoursSet":false,"appointmentLink":false,"servicesListed":true,"attributesSet":false,"descriptionUsesKeywords":true,"descriptionMentionsServiceArea":false,"issues":["specific issue"],"wins":["specific win"],"pitchSummary":"personalised cold outreach referencing specific things","notFound":false}\n\nRules: issues and wins must reference actual data points. pitchSummary must name the business and mention something specific you see.'
      }]
    })

    const aiText = aiRes.content.filter(b => b.type === 'text').map(b => (b as AnyRecord).text as string).join('').trim()
    const aiStart = aiText.indexOf('{')
    const aiEnd = aiText.lastIndexOf('}')
    const aiData = aiStart !== -1 && aiEnd > aiStart ? JSON.parse(aiText.substring(aiStart, aiEnd + 1)) as AnyRecord : {}

    const result: AnyRecord = {
      ...placesData,
      suburb,
      secondaryCategories: [],
      holidayHoursSet: aiData.holidayHoursSet ?? false,
      appointmentLink: aiData.appointmentLink ?? false,
      servicesListed: aiData.servicesListed ?? placesData.servicesListed,
      attributesSet: aiData.attributesSet ?? false,
      descriptionUsesKeywords: aiData.descriptionUsesKeywords ?? placesData.hasDescription,
      descriptionMentionsServiceArea: aiData.descriptionMentionsServiceArea ?? false,
      issues: aiData.issues ?? [],
      wins: aiData.wins ?? [],
      pitchSummary: aiData.pitchSummary ?? '',
      notFound: false,
      dataSource: accessToken ? 'business_profile_api' : 'places_api',
    }

    const response = NextResponse.json({ success: true, data: result })

    // Refresh cookie if we used a refreshed token
    if (accessToken && !request.cookies.get('gbp_access_token')?.value) {
      response.cookies.set('gbp_access_token', accessToken, { httpOnly: true, secure: true, maxAge: 3600, path: '/' })
    }

    return response
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
