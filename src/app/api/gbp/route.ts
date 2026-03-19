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
      system: `You are a Google Business Profile auditor for Australian businesses. Your job is to search for a business and extract everything visible about their GBP listing.

CRITICAL RULES — read carefully before searching:
1. Always do ALL 4 searches before writing any JSON.
2. Be DECISIVE. If data appears in search results, mark it as found. Never default to false/null just because you're unsure.
3. reviewCount MUST be a number (e.g. 13). Never return null for reviewCount — use 0 if genuinely no reviews.
4. ownerRespondsToReviews: search specifically for owner replies. If you see ANY "Response from the owner" text in any result, set true. If the business has 5+ reviews and no obvious complaints going unanswered, lean toward true.
5. allDaysSet means hours are configured for every day — days explicitly marked "Closed" COUNT as set. Only return false if some days are completely missing from the hours listing.
6. hoursSet: true if any business hours are shown at all.
7. hasRecentPosts / lastPostDaysAgo: Posts older than 30 days are NOT a failure — they're just an opportunity to improve. Be accurate about the age.
8. Output ONLY raw JSON — no markdown, no explanation.`,
      messages: [{
        role: 'user',
        content: `Search Google for the business "${businessName}" in ${suburb}, Australia.

Do ALL 4 of these searches before writing your answer:

1. Search: "${businessName} ${suburb}" — find their GBP panel, grab hours, rating, review count, description, category, photos, address, phone, website
2. Search: "${businessName} ${suburb} reviews" — look specifically for review content and OWNER REPLIES. Any text saying "Response from the owner" or "Owner response" means ownerRespondsToReviews = true
3. Search: "${businessName} ${suburb} Google Business" — find additional profile data: posts, Q&A, services, attributes
4. Search: "${businessName} ${suburb} site:maps.google.com OR site:google.com/maps" — extract any remaining GBP details

After all 4 searches, return ONLY this JSON (no markdown fences):
{
  "businessName": "exact business name from GBP",
  "address": "full street address",
  "suburb": "${suburb}",
  "phone": "phone number as string, or null only if truly not listed",
  "website": "website URL or null",
  "category": "primary GBP category",
  "secondaryCategories": [],
  "rating": 4.5,
  "reviewCount": 13,
  "hasRecentReviews": true,
  "unansweredReviews": 0,
  "ownerRespondsToReviews": true,
  "hoursSet": true,
  "allDaysSet": true,
  "holidayHoursSet": false,
  "hasDescription": true,
  "descriptionUsesKeywords": true,
  "descriptionMentionsServiceArea": false,
  "hasLogo": true,
  "hasCoverPhoto": true,
  "photoCount": 10,
  "hasRecentPhotos": false,
  "hasRecentPosts": false,
  "lastPostDaysAgo": 45,
  "hasQandA": false,
  "unansweredQuestions": 0,
  "ownerQandA": false,
  "appointmentLink": false,
  "servicesListed": true,
  "serviceAreaSet": false,
  "attributesSet": true,
  "issues": ["No Google posts in last 30 days — last post was ~45 days ago", "No Q&A section seeded with common questions"],
  "wins": ["13 Google reviews with strong rating", "Owner actively responds to reviews", "Business hours fully configured including weekend closures"],
  "pitchSummary": "Hi [Name], I came across [Business] on Google and noticed a few quick wins that could help you get more leads online. [Specific observation]. At BEAL Creative we help local businesses like yours get found faster — happy to show you what's possible. Phil",
  "notFound": false
}

Field-by-field rules:
- reviewCount: ALWAYS a number. If you saw "13 reviews" anywhere, set 13. Never null.
- ownerRespondsToReviews: If you see ANY "Response from the owner" in search results → true. If business has many reviews and seems well-managed → lean true. Only set false if you explicitly see unanswered negative reviews or zero responses visible anywhere.
- allDaysSet: Days listed as "Closed" on Saturday/Sunday STILL COUNT as set. Return true if every day of the week has an entry (even if some say Closed). Only false if days are completely absent from the hours listing.
- hoursSet: true if any hours at all are shown.
- hasRecentPosts: true only if a post is within the last 30 days. lastPostDaysAgo should be your best estimate of days since last post.
- hasRecentReviews: true if any review is from the last 90 days.
- unansweredReviews: your estimate of reviews without an owner reply — use 0 if all appear answered or you cannot confirm any are unanswered.
- Make issues and wins SPECIFIC to this business, not generic platitudes.`
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

    // Post-process: ensure numeric fields are always numbers, never null
    if (data.reviewCount === null || data.reviewCount === undefined) data.reviewCount = 0
    if (data.unansweredReviews === null || data.unansweredReviews === undefined) data.unansweredReviews = 0
    if (data.unansweredQuestions === null || data.unansweredQuestions === undefined) data.unansweredQuestions = 0

    return NextResponse.json({ success: true, data })

  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Something went wrong'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}