import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

// Postcode centre coordinates for common AU postcodes
// Falls back to geocoding via Places API if not found
const POSTCODE_COORDS: Record<string, { lat: number; lng: number }> = {
  '2640': { lat: -36.0737, lng: 146.9135 }, // Albury NSW
  '2641': { lat: -36.0200, lng: 146.9300 },
  '3000': { lat: -37.8136, lng: 144.9631 }, // Melbourne
  '2000': { lat: -33.8688, lng: 151.2093 }, // Sydney
  '4000': { lat: -27.4698, lng: 153.0251 }, // Brisbane
  '5000': { lat: -34.9285, lng: 138.6007 }, // Adelaide
  '6000': { lat: -31.9505, lng: 115.8605 }, // Perth
}

async function getPostcodeCoords(postcode: string, apiKey: string): Promise<{ lat: number; lng: number } | null> {
  if (POSTCODE_COORDS[postcode]) return POSTCODE_COORDS[postcode]
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${postcode}+Australia&key=${apiKey}`
  const res = await fetch(url)
  const data = await res.json() as AnyRecord
  const loc = data.results?.[0]?.geometry?.location
  return loc ? { lat: loc.lat, lng: loc.lng } : null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as AnyRecord
    const { industry, postcode, suburb, count } = body as {
      industry: string; postcode: string; suburb?: string; count?: string
    }
    if (!industry || !postcode) {
      return NextResponse.json({ success: false, error: 'Keyword and postcode are required' }, { status: 400 })
    }

    const placesKey = process.env.GOOGLE_PLACES_API_KEY
    if (!placesKey) {
      return NextResponse.json({ success: false, error: 'Google Places API key not configured' }, { status: 500 })
    }

    const n = parseInt(count || '5')

    // Step 1: Get coordinates for postcode
    const coords = await getPostcodeCoords(postcode, placesKey)
    if (!coords) {
      return NextResponse.json({ success: false, error: 'Could not locate postcode — please try again' }, { status: 422 })
    }

    // Step 2: Search Google Places for real local businesses
    const searchQuery = suburb ? `${industry} ${suburb}` : `${industry}`
    const placesUrl = `https://places.googleapis.com/v1/places:searchText`
    const placesRes = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': placesKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.websiteUri,places.rating,places.userRatingCount,places.nationalPhoneNumber,places.regularOpeningHours,places.photos',
      },
      body: JSON.stringify({
        textQuery: searchQuery,
        locationBias: {
          circle: {
            center: { latitude: coords.lat, longitude: coords.lng },
            radius: 20000 // 20km radius
          }
        },
        maxResultCount: Math.min(n * 3, 20), // Get more than needed so we have enough after filtering
      })
    })

    const placesData = await placesRes.json() as AnyRecord
    const places: AnyRecord[] = placesData.places || []

    if (!places.length) {
      return NextResponse.json({ success: false, error: 'No businesses found for that keyword and location' }, { status: 422 })
    }

    // Step 3: Filter to businesses with an address matching the postcode/suburb area
    const targetSuburb = (suburb || '').toLowerCase()
    const localPlaces = places.filter((p: AnyRecord) => {
      const addr = (p.formattedAddress || '').toLowerCase()
      // Must contain the postcode OR the suburb name in their real address
      return addr.includes(postcode) || (targetSuburb && addr.includes(targetSuburb)) || addr.includes('albury') || addr.includes('wodonga')
    })

    // Use all places if the filter is too aggressive
    const candidates = localPlaces.length >= 2 ? localPlaces : places

    // Step 4: Ask Claude to score the verified real businesses by WEAKNESS (Lead Machine = find weak prospects)
    const businessList = candidates.slice(0, n + 3).map((p: AnyRecord) => ({
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      website: p.websiteUri || 'No website',
      rating: p.rating || null,
      reviewCount: p.userRatingCount || 0,
      phone: p.nationalPhoneNumber || null,
      hasOpeningHours: !!p.regularOpeningHours,
      photoCount: p.photos?.length || 0,
    }))

    const client = new Anthropic()
    const response = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: 'You score local businesses by weakness of their online presence. Output only raw JSON array.',
      messages: [{
        role: 'user',
        content: `These are real local businesses found via Google Places API near ${suburb || postcode} NSW. Score each by how WEAK their online presence is — lower score = weaker = better prospect to pitch digital marketing to.

Businesses:
${JSON.stringify(businessList, null, 2)}

Return a JSON array of ${Math.min(n, businessList.length)} objects (pick the ${Math.min(n, businessList.length)} weakest):
- businessName: string
- website: string
- industry: "${industry}"
- address: string
- overallScore: integer 15-55 (lower = weaker online presence)
- categories: object with keys seo, ux, conversion, mobile, content, brand (each 15-60)
- criticalIssues: integer 2-6
- opportunityScore: integer 6-9
- pitchHook: max 8 words describing main weakness
- issues: array of 2 short strings describing specific weaknesses
- opportunities: array of 1 short string

Businesses with no website should score lowest. Businesses with few reviews score lower. Start with [`
      }]
    })

    const text = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = text.indexOf('[')
    const end = text.lastIndexOf(']')
    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'Could not score results — please try again' }, { status: 422 })
    }

    let prospects: AnyRecord[] = []
    try {
      prospects = JSON.parse(text.substring(start, end + 1)) as AnyRecord[]
    } catch {
      const objMatches = text.substring(start, end + 1).match(/\{[^{}]+\}/g)
      if (objMatches) {
        for (const m of objMatches) {
          try { prospects.push(JSON.parse(m) as AnyRecord) } catch { continue }
        }
      }
    }

    if (!prospects.length) {
      return NextResponse.json({ success: false, error: 'Could not parse results — please try again' }, { status: 422 })
    }

    return NextResponse.json({ success: true, prospects })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
