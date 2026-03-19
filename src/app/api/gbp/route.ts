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

    const client = new Anthropic()

    const response = await (client.messages as AnyRecord).create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a Google Business Profile auditor. Search thoroughly for the business and extract all visible data. Be decisive — if you can see data, report it as true. Only use null when data is genuinely invisible. Output only raw JSON.',
      messages: [{
        role: 'user',
        content: `Search Google for the business "${businessName}" in ${suburb}, Australia. 

Do multiple searches:
1. Search: "${businessName} ${suburb}" to find their Google Business Profile
2. Search: "${businessName} ${suburb} Google reviews" to find review data
3. Search: "${businessName} ${suburb} site:maps.google.com" for more GBP data

Extract everything you can see. Be assertive — if their GBP panel appears in Google search results showing info like hours, reviews, photos, description etc, those things ARE set. Do not say null/false/unknown just because you are unsure — make your best determination from what you find.

Return ONLY this JSON object, no markdown:
{
  "businessName": "exact name from GBP",
  "address": "full address from GBP",
  "suburb": "${suburb}",
  "phone": "phone number or null if genuinely not listed",
  "website": "website URL or null",
  "category": "primary GBP category",
  "secondaryCategories": [],
  "rating": 4.5,
  "reviewCount": 42,
  "hasRecentReviews": true,
  "unansweredReviews": 0,
  "ownerRespondsToReviews": true,
  "hoursSet": true,
  "allDaysSet": true,
  "holidayHoursSet": false,
  "hasDescription": true,
  "descriptionUsesKeywords": true,
  "descriptionMentionsServiceArea": true,
  "hasLogo": true,
  "hasCoverPhoto": true,
  "photoCount": 15,
  "hasRecentPhotos": true,
  "hasRecentPosts": false,
  "lastPostDaysAgo": 90,
  "hasQandA": false,
  "unansweredQuestions": 0,
  "ownerQandA": false,
  "appointmentLink": false,
  "servicesListed": true,
  "serviceAreaSet": true,
  "attributesSet": true,
  "issues": ["Specific issue found, e.g. No posts in last 30 days", "Another specific issue"],
  "wins": ["Specific strength, e.g. 4.8 star rating with 42 reviews", "Another strength"],
  "pitchSummary": "Hi [Name], I came across [Business] on Google and noticed a few quick wins that could help you get more leads online. [Specific observation about their GBP]. At BEAL Creative we help local businesses like yours get found faster — happy to show you what's possible. Phil",
  "notFound": false
}

Important rules:
- If you can see a description on their GBP, set hasDescription: true
- If hours are shown in the search results panel, set hoursSet: true and allDaysSet: true  
- If photos appear on their GBP listing, set hasCoverPhoto: true and estimate photoCount from what you see
- If they have a logo/profile image, set hasLogo: true
- If their service area cities are listed, set serviceAreaSet: true
- reviewCount and rating: use exact numbers you can see
- hasRecentReviews: true if any reviews are from the last 90 days
- ownerRespondsToReviews: true if you can see any owner responses
- Make issues and wins specific to THIS business, not generic`
      }]
    })

    const text = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'Could not extract GBP data — please try again' }, { status: 422 })
    }

    const data = JSON.parse(text.substring(start, end + 1)) as AnyRecord
    return NextResponse.json({ success: true, data })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
