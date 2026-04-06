// Server-side page scraper — extracts real content from a URL
// Runs before the AI audit so the AI analyses actual data, not guesses

export interface ScrapedPage {
  url: string
  finalUrl: string
  title: string
  metaDescription: string
  canonicalUrl: string
  language: string
  h1: string[]
  h2: string[]
  h3: string[]
  wordCount: number
  paragraphCount: number
  internalLinks: number
  externalLinks: number
  images: number
  imagesWithAlt: number
  imagesMissingAlt: number
  hasForms: boolean
  formCount: number
  formFields: number
  hasVideo: boolean
  hasSchema: boolean
  schemaTypes: string[]
  hasOpenGraph: boolean
  hasTwitterCard: boolean
  hasViewport: boolean
  hasHttps: boolean
  responseTimeMs: number
  htmlSizeBytes: number
  hasGoogleAnalytics: boolean
  hasGTM: boolean
  hasFavicon: boolean
  hasCanonical: boolean
  robots: string
  charset: string
  serverHeader: string
  hasHreflang: boolean
  navLinksCount: number
  ctaButtonCount: number
  phoneNumbers: string[]
  emailAddresses: string[]
  isSinglePageSite: boolean
  questionHeadings: number
  listCount: number
  tableCount: number
  faqAnswerPairs: number
  faqSchemaQAPairs: number
  hasTestimonials: boolean
  testimonialCount: number
  hasStarRatings: boolean
  hasCaseStudies: boolean
  navLinks: string[]
  error?: string
}

export async function scrapePage(url: string, clientHtml?: string): Promise<ScrapedPage> {
  const start = Date.now()
  const blank: ScrapedPage = {
    url, finalUrl: url, title: '', metaDescription: '', canonicalUrl: '',
    language: '', h1: [], h2: [], h3: [], wordCount: 0, paragraphCount: 0,
    internalLinks: 0, externalLinks: 0, images: 0, imagesWithAlt: 0,
    imagesMissingAlt: 0, hasForms: false, formCount: 0, formFields: 0,
    hasVideo: false, hasSchema: false, schemaTypes: [], hasOpenGraph: false,
    hasTwitterCard: false, hasViewport: false, hasHttps: url.startsWith('https'),
    responseTimeMs: 0, htmlSizeBytes: 0, hasGoogleAnalytics: false, hasGTM: false,
    hasFavicon: false, hasCanonical: false, robots: '', charset: '', serverHeader: '',
    hasHreflang: false, navLinksCount: 0, ctaButtonCount: 0, phoneNumbers: [], emailAddresses: [],
    isSinglePageSite: false,
  questionHeadings: 0,
  listCount: 0,
  tableCount: 0,
  faqAnswerPairs: 0,
  faqSchemaQAPairs: 0,
  hasTestimonials: false,
  testimonialCount: 0,
  hasStarRatings: false,
  hasCaseStudies: false,
  navLinks: [],
  }

  try {
    let html = clientHtml ?? ''

    if (clientHtml) {
      blank.responseTimeMs = 0
      blank.finalUrl = url
      blank.hasHttps = url.startsWith('https')
      blank.htmlSizeBytes = new TextEncoder().encode(clientHtml).length
    }

    if (!clientHtml) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)

      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        redirect: 'follow',
      })
      clearTimeout(timeout)

      blank.responseTimeMs = Date.now() - start
      blank.finalUrl = res.url
      blank.hasHttps = res.url.startsWith('https')
      blank.serverHeader = res.headers.get('server') ?? ''
      blank.htmlSizeBytes = parseInt(res.headers.get('content-length') ?? '0')

      let blocked = res.status >= 400 || res.status === 403 || res.status === 429
      if (!blocked) {
        const bodyText = await res.text()
        // Detect soft blocks — tiny body or obvious bot detection pages
        if (bodyText.length < 1000 || /access denied|blocked|captcha|bot detection/i.test(bodyText.substring(0, 500))) {
          blocked = true
        } else {
          html = bodyText
        }
      }

      // ScrapingBee fallback for IP-blocked sites
      if (blocked) {
        const sbKey = process.env.SCRAPINGBEE_API_KEY
        if (sbKey) {
          try {
            const sbUrl = 'https://app.scrapingbee.com/api/v1/?api_key=' + sbKey + '&url=' + encodeURIComponent(url) + '&render_js=false&block_ads=true'
            const sbRes = await fetch(sbUrl, { signal: AbortSignal.timeout(15000) })
            if (sbRes.ok) {
              const sbBody = await sbRes.text()
              if (sbBody.length > 1000) {
                html = sbBody
                blank.estimated = false
              }
            }
          } catch (_sbErr) { /* ScrapingBee also failed */ }
        }
        if (!html) {
          return { ...blank, error: 'HTTP ' + res.status }
        }
      }
    }

    if (!blank.htmlSizeBytes) blank.htmlSizeBytes = new TextEncoder().encode(html).length

    if (!blank.htmlSizeBytes) blank.htmlSizeBytes = new TextEncoder().encode(html).length

    // ── Extract using regex (no DOM parser available in Node edge runtime) ──

    // Title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    blank.title = titleMatch?.[1]?.trim() ?? ''

    // Meta tags
    const getMeta = (name: string) => {
      const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
        ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'))
      return m?.[1]?.trim() ?? ''
    }
    blank.metaDescription = getMeta('description')
    blank.hasOpenGraph = /<meta[^>]+property=["']og:/i.test(html)
    blank.hasTwitterCard = /<meta[^>]+name=["']twitter:/i.test(html)
    blank.hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html)
    blank.robots = getMeta('robots')

    // Canonical
    const canonMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
      ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)
    blank.canonicalUrl = canonMatch?.[1]?.trim() ?? ''
    blank.hasCanonical = !!blank.canonicalUrl

    // Language
    const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i)
    blank.language = langMatch?.[1]?.trim() ?? ''

    // Charset
    const charsetMatch = html.match(/charset=["']?([^"'\s>]+)/i)
    blank.charset = charsetMatch?.[1]?.toUpperCase() ?? ''

    // Favicon
    blank.hasFavicon = /<link[^>]+rel=["'][^"']*icon[^"']*["']/i.test(html)

    // Hreflang
    blank.hasHreflang = /<link[^>]+rel=["']alternate["'][^>]+hreflang/i.test(html)

    // Headings — use non-greedy match then strip inner tags to handle
    // nested elements like <h1><span>Text</span></h1> (common in Webflow/Framer)
    const extractHeadings = (tag: string) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi')
      const matches = [...html.matchAll(re)]
      return matches
        .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(Boolean)
        .slice(0, 10)
    }
    blank.h1 = extractHeadings('h1')
    blank.h2 = extractHeadings('h2')
    blank.h3 = extractHeadings('h3')

    // Strip scripts/styles/nav/header/footer for word count
    const bodyText = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    blank.wordCount = bodyText.split(/\s+/).filter(w => w.length > 2).length

    // Paragraphs
    blank.paragraphCount = (html.match(/<p[\s>]/gi) ?? []).length

    // Links
    const domain = new URL(url).hostname.replace('www.', '')
    const allLinks = [...html.matchAll(/href=["']([^"'#?]+)/gi)].map(m => m[1])
    blank.internalLinks = allLinks.filter(l => l.startsWith('/') || l.includes(domain)).length
    blank.externalLinks = allLinks.filter(l => l.startsWith('http') && !l.includes(domain)).length

    // Images
    const imgTags = [...html.matchAll(/<img[^>]+>/gi)].map(m => m[0])
    blank.images = imgTags.length
    blank.imagesWithAlt = imgTags.filter(img => /alt=["'][^"']+["']/i.test(img)).length
    blank.imagesMissingAlt = imgTags.filter(img => !(/alt=["'][^"']*["']/i.test(img)) || /alt=["']['"]/.test(img)).length

    // Forms — exclude hidden inputs, honeypot fields, and non-visible inputs
    const formTags = html.match(/<form[\s>]/gi) ?? []
    blank.formCount = formTags.length
    blank.hasForms = blank.formCount > 0
    // Only count visible input types that a user actually interacts with
    const visibleInputTypes = /type=["'](?:text|email|tel|number|password|search|url|date|time|month|week|color|range|file|checkbox|radio)["']/i
    const inputTags = html.match(/<input[^>]+>/gi) ?? []
    const visibleInputs = inputTags.filter(tag =>
      !(/type=["']hidden["']/i.test(tag)) &&        // exclude hidden
      !(/type=["']submit["']/i.test(tag)) &&         // exclude submit buttons
      !(/type=["']button["']/i.test(tag)) &&         // exclude buttons
      !(/type=["']reset["']/i.test(tag)) &&          // exclude reset
      !(/type=["']image["']/i.test(tag)) &&          // exclude image buttons
      (!tag.includes('type=') || visibleInputTypes.test(tag)) // include typeless (defaults to text) or visible types
    )
    blank.formFields = visibleInputs.length
      + (html.match(/<textarea/gi) ?? []).length
      + (html.match(/<select/gi) ?? []).length

    // Video
    blank.hasVideo = /<(?:video|iframe)[^>]+(?:youtube|vimeo|wistia|video)/i.test(html)

    // Schema markup
    const schemaMatches = [...html.matchAll(/"@type"\s*:\s*"([^"]+)"/g)]
    blank.schemaTypes = [...new Set(schemaMatches.map(m => m[1]))]
    blank.hasSchema = blank.schemaTypes.length > 0

    // Analytics
    blank.hasGoogleAnalytics = /googletagmanager|google-analytics|gtag\(/i.test(html)
    blank.hasGTM = /googletagmanager\.com\/gtm/i.test(html)

    // CTA buttons — look for common CTA patterns
    const ctaPatterns = /(?:class|id)=["'][^"']*(?:cta|btn|button|contact|enquire|quote|call|book)[^"']*["']/gi
    blank.ctaButtonCount = (html.match(ctaPatterns) ?? []).length

    // Nav links
    const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i)
    if (navMatch) {
      blank.navLinksCount = (navMatch[1].match(/<a\s/gi) ?? []).length
    }

    // Single page site detection
    // Signals: very few unique internal paths, low word count, minimal heading structure
    const uniquePaths = new Set(
      allLinks
        .filter(l => l.startsWith('/') || l.includes(domain))
        .map(l => {
          try { return new URL(l.startsWith('http') ? l : `https://${domain}${l}`).pathname } catch { return l }
        })
        .filter(p => p !== '/' && p !== '')
    )
    blank.isSinglePageSite = uniquePaths.size <= 3 && blank.internalLinks < 15

    // Phone numbers — check tel: href links AND scan text for AU phone patterns (catches JS-rendered phones)
    const telMatches = html.match(/(?:tel:|href=["']tel:)[^"'\s<>]+/gi) ?? []
    const telPhones = telMatches.map(p => p.replace(/tel:|href=["']tel:|["']/gi, '').trim())
    const auPhoneMatches = html.match(/(?:\+61|0)[2-9]\d{8}|(?:\+61|0)4\d{8}/g) ?? []
    blank.phoneNumbers = ([...new Set([...telPhones, ...auPhoneMatches])].filter(p => p.length >= 8) as string[]).slice(0, 3)

    // Email addresses
    const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? []
    blank.emailAddresses = [...new Set(emailMatches)].slice(0, 3)

    // AEO signals
    const allHeadings = [...blank.h1, ...blank.h2, ...blank.h3]
    blank.questionHeadings = allHeadings.filter(h => /^(who|what|when|where|how|why|is|are|can|does|do|will|should|which)\b/i.test(h.trim())).length
    blank.listCount = (html.match(/<[uo]l[\s>]/gi) ?? []).length
    blank.tableCount = (html.match(/<table[\s>]/gi) ?? []).length

    // FAQ answer pairs — two-pass: collect all question headings + all answer bodies, pair by proximity
    const stripTagsLocal = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim()
    const isQuestionHeading = (q: string) => /^(who|what|when|where|how|why|is|are|can|does|do|will|should|which)\b/i.test(q.trim())
    const qRegex2 = /<h[23][^>]*>([^<]+)<\/h[23]>/gi
    const questions2: Array<{ text: string; pos: number }> = []
    let qm2
    while ((qm2 = qRegex2.exec(html)) !== null) {
      const q = qm2[1].trim()
      if (isQuestionHeading(q)) questions2.push({ text: q, pos: qm2.index })
    }
    const aRegex2 = /<div[^>]*class="[^"]*(?:faqs__item-body|item-body|faq-answer|accordion-body|accordion-content|answer-content)[^"]*"[^>]*>([\s\S]{0,2000}?)<\/div>/gi
    const answers2: Array<{ text: string; pos: number }> = []
    let am2
    while ((am2 = aRegex2.exec(html)) !== null) {
      const aText = stripTagsLocal(am2[1])
      if (aText.length >= 80) answers2.push({ text: aText, pos: am2.index })
    }
    let faqPairCount = 0
    const seenQ2 = new Set<string>()
    for (const q of questions2) {
      if (seenQ2.has(q.text)) continue
      const nearest = answers2.find(a => a.pos > q.pos && a.pos - q.pos < 1500)
      if (nearest) { seenQ2.add(q.text); faqPairCount++ }
    }
    blank.faqAnswerPairs = faqPairCount

    // FAQ schema Q&A pairs: count @type:Question entries inside FAQPage JSON-LD
    const faqSchemaCount = (html.match(/"@type"\s*:\s*"Question"/gi) ?? []).length
    blank.faqSchemaQAPairs = faqSchemaCount

    // Testimonial & review detection
    // Matches Elementor, WPBakery, custom testimonial sections, Google review widgets
    const testimonialPatterns = [
      /class=["'][^"']*(?:testimonial|review-card|review-item|star-rating|customer-review|client-review|rating-widget)[^"']*["']/gi,
      /(?:elfsight|trustpilot|google.*review|review.*widget)/gi,
      /<(?:div|section|article)[^>]*class=["'][^"']*(?:testimonial|review)[^"']*["'][^>]*>/gi,
    ]
    let testimonialMatches = 0
    for (const pat of testimonialPatterns) {
      const m = html.match(pat) ?? []
      testimonialMatches += m.length
    }
    // Also count structured review items (schema.org Review or individual testimonial blocks)
    const schemaReviews = (html.match(/"@type"s*:s*"Review"/gi) ?? []).length
    const elementorTestimonials = (html.match(/elementor-testimonial(?!__)/gi) ?? []).length
    blank.testimonialCount = Math.max(schemaReviews, Math.floor(elementorTestimonials / 2), Math.floor(testimonialMatches / 3))
    blank.hasTestimonials = blank.testimonialCount > 0 || testimonialMatches > 0

    // Star rating detection
    blank.hasStarRatings = /(?:class=["'][^"']*(?:star-rating|stars|fa-star|rating)[^"']*["']|"ratingValue"|itemprop=["']ratingValue["'])/i.test(html)

    // Case study / portfolio detection
    // Case study detection — strip scripts/styles first to avoid false positives from framework code
    const htmlNoScript = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    // Only match in visible text content — look for patterns in tag text/attributes that indicate real work examples
    const hasRealCaseStudies = /case\s*stud/i.test(htmlNoScript)
    const hasPortfolioContent = /(?:class|id|href|title|alt|aria-label)=[^>]*portfolio[^>]*>|>\s*(?:our\s+)?portfolio\s*</i.test(htmlNoScript)
    const hasWorkSection = />\s*(?:our\s+work|recent\s+work|featured\s+work|view\s+work|see\s+our\s+work)\s*</i.test(htmlNoScript)
    const hasClientResults = />\s*(?:client\s+results?|client\s+projects?|success\s+stor|case\s+results?)\s*</i.test(htmlNoScript)
    const hasBuiltFor = />\s*(?:built\s+for|designed\s+for|developed\s+for|delivered\s+for)\s*</i.test(htmlNoScript)
    blank.hasCaseStudies = hasRealCaseStudies || hasPortfolioContent || hasWorkSection || hasClientResults || hasBuiltFor

    // Nav link text extraction
    const navMatches = html.match(/<(?:nav|header)[^>]*>[\s\S]*?<\/(?:nav|header)>/gi) ?? []
    const navHtml = navMatches.join(' ')
    const navAnchorMatches = navHtml.match(/<a[^>]*>([^<]+)<\/a>/gi) ?? []
    const navLinkTexts: string[] = []
    for (let ni = 0; ni < navAnchorMatches.length; ni++) {
      const navM = navAnchorMatches[ni].match(/<a[^>]*>([^<]+)<\/a>/i)
      if (navM && navM[1]) navLinkTexts.push(navM[1].trim())
    }
    blank.navLinks = [...new Set(navLinkTexts)].filter(t => t.length > 1 && t.length < 40).slice(0, 20)

    return blank
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fetch failed'
    return { ...blank, responseTimeMs: Date.now() - start, error: `Could not fetch page: ${msg}` }
  }
}

export function scraperSummary(s: ScrapedPage): string {
  if (s.error) {
    return `Note: Could not fetch the live page (${s.error}). Analyse based on URL, domain, and path context only.`
  }

  const lines: string[] = [
    `=== REAL PAGE DATA (fetched live) ===`,
    `URL: ${s.finalUrl}`,
    s.isSinglePageSite ? `⚠ SINGLE PAGE SITE DETECTED — very few unique internal paths (${s.internalLinks} internal links). Flag all single-page SEO disadvantages explicitly in the audit.` : `Multi-page site (${s.internalLinks} internal links detected)`,
    `Response time: ${s.responseTimeMs}ms (${s.responseTimeMs < 400 ? 'FAST' : s.responseTimeMs < 1000 ? 'ACCEPTABLE' : 'SLOW — flagging this'})`,
    `HTML size: ${Math.round(s.htmlSizeBytes / 1024)}kB`,
    ``,
    `--- HEAD / META ---`,
    `Title: ${s.title || 'MISSING'}`,
    `Meta description: ${s.metaDescription || 'MISSING'}`,
    `Canonical: ${s.canonicalUrl || 'MISSING'}`,
    `Language: ${s.language || 'not set'}`,
    `Charset: ${s.charset || 'not detected'}`,
    `Robots: ${s.robots || 'not set (defaults to index/follow)'}`,
    `Open Graph: ${s.hasOpenGraph ? 'YES' : 'MISSING'}`,
    `Twitter Card: ${s.hasTwitterCard ? 'YES' : 'MISSING'}`,
    `Hreflang: ${s.hasHreflang ? 'YES' : 'not present'}`,
    `Favicon: ${s.hasFavicon ? 'YES' : 'MISSING'}`,
    ``,
    `--- CONTENT ---`,
    `H1 tags (${s.h1.length}): ${s.h1.join(' | ') || 'NONE FOUND IN STATIC HTML — may be JS-rendered; flag as possible issue, not definitive fail'}`,
    `H2 tags (${s.h2.length}): ${s.h2.slice(0, 5).join(' | ') || 'none'}`,
    `H3 tags (${s.h3.length}): ${s.h3.slice(0, 4).join(' | ') || 'none'}`,
    `Word count: ${s.wordCount} (${s.wordCount < 300 ? 'VERY LOW — flag this' : s.wordCount < 600 ? 'below 800 target' : s.wordCount >= 800 ? 'good' : 'borderline'})`,
    `Paragraphs: ${s.paragraphCount}`,
    ``,
    `--- LINKS ---`,
    `Internal links: ${s.internalLinks}`,
    `External links: ${s.externalLinks}`,
    `Nav links: ${s.navLinksCount} (${s.navLinksCount > 10 ? 'HIGH — many exit points' : 'acceptable'})`,
    ``,
    `--- IMAGES ---`,
    `Total images: ${s.images}`,
    `With alt text: ${s.imagesWithAlt}`,
    `MISSING alt text: ${s.imagesMissingAlt}${s.imagesMissingAlt > 0 ? ' — FLAG THIS' : ''}`,
    ``,
    `--- CONVERSION ---`,
    `Forms on page: ${s.hasForms ? `YES — ${s.formCount} form(s) with ~${s.formFields} input fields` : 'NO FORMS DETECTED — FLAG THIS'}`,
    `CTA elements: ${s.ctaButtonCount}`,
    `Phone numbers: ${s.phoneNumbers.length > 0 ? s.phoneNumbers.join(', ') : 'none found on page'}`,
    `Email addresses: ${s.emailAddresses.length > 0 ? s.emailAddresses.join(', ') : 'none visible'}`,
    `Video content: ${s.hasVideo ? 'YES' : 'none detected'}`,
    ``,
    `--- TECHNICAL ---`,
    `HTTPS: ${s.hasHttps ? 'YES' : 'NO — CRITICAL ISSUE'}`,
    `Mobile viewport: ${s.hasViewport ? 'YES' : 'MISSING'}`,
    `Schema markup: ${s.hasSchema ? `YES — ${s.schemaTypes.join(', ')}` : 'NONE — FLAG THIS'}`,
    `Google Analytics / GTM: ${s.hasGoogleAnalytics || s.hasGTM ? 'YES' : 'NOT DETECTED'}`,
    `Server: ${s.serverHeader || 'not disclosed'}`,
    `=== END REAL PAGE DATA ===`,
  ]

  return lines.join('\n')
}
