import { NextRequest, NextResponse } from 'next/server'
import { scrapePage } from '@/lib/scraper'
import { runTechnicalChecks } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json() as { url: string }
    if (!url) return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 })
    try { new URL(url) } catch { return NextResponse.json({ success: false, error: 'Invalid URL' }, { status: 400 }) }
    const scraped = await scrapePage(url)
    if (scraped.error) return NextResponse.json({ success: false, error: scraped.error }, { status: 400 })
    const { score, breakdown } = runTechnicalChecks(scraped)
    return NextResponse.json({
      success: true,
      url: scraped.finalUrl || url,
      score,
      breakdown,
      meta: {
        title: scraped.title,
        titleLength: scraped.title?.length ?? 0,
        metaDescription: scraped.metaDescription,
        metaDescriptionLength: scraped.metaDescription?.length ?? 0,
        h1Count: scraped.h1?.length ?? 0,
        wordCount: scraped.wordCount,
        responseTimeMs: scraped.responseTimeMs,
        images: scraped.images,
        imagesWithAlt: scraped.imagesWithAlt,
        hasViewport: scraped.hasViewport,
        hasHttps: scraped.hasHttps,
        hasCanonical: scraped.hasCanonical,
        hasSchema: scraped.hasSchema,
        schemaTypes: scraped.schemaTypes,
      }
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
