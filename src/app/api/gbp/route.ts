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
      max_tokens: 3000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      system: 'You are a Google Business Profile auditor. Search for the business and extract all visible GBP data. Output only raw JSON.',
      messages: [{
        role: 'user',
        content: `Search for the Google Business Profile of "${businessName}" in ${suburb}, Australia. Extract everything publicly visible and return a JSON object with this exact structure (no markdown, no explanation):

{
  "businessName": "exact name on GBP",
  "address": "full address",
  "suburb": "${suburb}",
  "phone": "phone number or null",
  "website": "website URL or null",
  "category": "primary category",
  "secondaryCategories": ["array of secondary categories"],
  "rating": 4.5,
  "reviewCount": 42,
  "hasRecentReviews": true,
  "unansweredReviews": 3,
  "ownerRespondsToReviews": true,
  "hoursSet": true,
  "allDaysSet": true,
  "holidayHoursSet": false,
  "hasDescription": true,
  "descriptionUsesKeywords": true,
  "descriptionMentionsServiceArea": false,
  "hasLogo": true,
  "hasCoverPhoto": true,
  "photoCount": 12,
  "hasRecentPhotos": true,
  "hasRecentPosts": false,
  "lastPostDaysAgo": 120,
  "hasQandA": false,
  "unansweredQuestions": 2,
  "ownerQandA": false,
  "appointmentLink": false,
  "servicesListed": true,
  "serviceAreaSet": false,
  "attributesSet": true,
  "issues": ["specific issue 1", "specific issue 2", "specific issue 3"],
  "wins": ["something they do well", "another strength"],
  "pitchSummary": "2-3 sentence cold outreach paragraph highlighting the main gaps and how a digital marketing agency could help. Be specific, not generic.",
  "notFound": false
}

If the business cannot be found on Google, return the same structure with notFound: true and all other fields null or empty.`
      }]
    })

    const text = (response.content as AnyRecord[])
      .filter((b: AnyRecord) => b.type === 'text')
      .map((b: AnyRecord) => b.text as string)
      .join('').trim()

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) {
      return NextResponse.json({ success: false, error: 'Could not extract GBP data — try again' }, { status: 422 })
    }

    const data = JSON.parse(text.substring(start, end + 1)) as AnyRecord
    return NextResponse.json({ success: true, data })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
