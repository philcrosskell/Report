'use client'
import { GbpAuditData } from '@/lib/types'

type CheckItem = { label: string; pass: boolean; warn: boolean; action: string }

function getChecks(d: GbpAuditData): CheckItem[] {
  return [
    { label: 'Phone number', pass: !!d.phone, warn: false, action: 'Add your phone number in GBP → Info' },
    { label: 'Website linked', pass: !!d.website, warn: false, action: 'Add your website URL in GBP → Info' },
    { label: 'Business description', pass: !!d.hasDescription, warn: false, action: 'Write a 750-char description in GBP → Info → From the owner' },
    { label: 'Description uses keywords', pass: !!d.descriptionUsesKeywords, warn: true, action: 'Include your services and suburb names in your description' },
    { label: 'Mentions service area', pass: !!d.descriptionMentionsServiceArea, warn: true, action: 'Name the regions you serve in your description' },
    { label: 'Hours set (all days)', pass: !!d.allDaysSet, warn: false, action: 'Set hours for every day in GBP → Info → Hours' },
    { label: 'Holiday hours configured', pass: !!d.holidayHoursSet, warn: true, action: 'Add special hours for public holidays in GBP → Special hours' },
    { label: 'Services listed', pass: !!d.servicesListed, warn: true, action: 'Add your services in GBP → Services' },
    { label: 'Appointment link', pass: !!d.appointmentLink, warn: true, action: 'Add a booking link in GBP → Info → Appointment links' },
    { label: 'Has reviews', pass: (d.reviewCount ?? 0) > 0, warn: false, action: 'Ask recent clients to leave a Google review' },
    { label: 'Recent reviews (90 days)', pass: !!d.hasRecentReviews, warn: false, action: 'Actively request reviews after each job' },
    { label: 'Owner responds to reviews', pass: !!d.ownerRespondsToReviews, warn: false, action: 'Reply to every review in GBP → Reviews' },
    { label: 'No unanswered reviews', pass: (d.unansweredReviews ?? 0) === 0, warn: (d.unansweredReviews ?? 0) > 0 && (d.unansweredReviews ?? 0) < 3, action: 'Reply to outstanding reviews in GBP → Reviews' },
    { label: 'Logo uploaded', pass: !!d.hasLogo, warn: false, action: 'Upload a logo in GBP → Photos → Logo' },
    { label: 'Cover photo uploaded', pass: !!d.hasCoverPhoto, warn: false, action: 'Upload a cover photo in GBP → Photos → Cover' },
    { label: '10+ photos uploaded', pass: (d.photoCount ?? 0) >= 10, warn: (d.photoCount ?? 0) >= 5 && (d.photoCount ?? 0) < 10, action: 'Upload at least 10 photos of your work and premises' },
    { label: 'Recent photos added', pass: !!d.hasRecentPhotos, warn: true, action: 'Add new photos regularly to signal an active listing' },
    { label: 'Google Posts active', pass: !!d.hasRecentPosts, warn: false, action: 'Publish a Google Post in GBP → Updates at least monthly' },
    { label: 'Service area configured', pass: !!d.serviceAreaSet, warn: false, action: 'Set your service area in GBP → Info → Service area' },
    { label: 'Attributes set', pass: !!d.attributesSet, warn: true, action: 'Add relevant attributes in GBP → Info → From the business' },
  ]
}

export default function GbpActionItems({ d }: { d: GbpAuditData }) {
  const checks = getChecks(d)
  const fixNow = checks.filter((c: CheckItem) => !c.pass && !c.warn)
  const easyWins = checks.filter((c: CheckItem) => !c.pass && c.warn)
  const passing = checks.filter((c: CheckItem) => c.pass)
  return (
    <div>
      {fixNow.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--red)' }}>Fix now</div>
          {fixNow.map((c: CheckItem, i: number) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0 text-[12px]" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--red)', fontWeight: 700, minWidth: 36 }}>Fail</span>
              <div>
                <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{c.label}</div>
                <div style={{ color: 'var(--t3)' }}>{c.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {easyWins.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--accent)' }}>Easy wins</div>
          {easyWins.map((c: CheckItem, i: number) => (
            <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0 text-[12px]" style={{ borderColor: 'var(--border)' }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 36 }}>Do it</span>
              <div>
                <div style={{ color: 'var(--t1)', fontWeight: 600 }}>{c.label}</div>
                <div style={{ color: 'var(--t3)' }}>{c.action}</div>
              </div>
            </div>
          ))}
        </div>
      )}
      {passing.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green)' }}>In good shape</div>
          <div className="flex flex-wrap gap-2">
            {passing.map((c: CheckItem, i: number) => (
              <span key={i} className="px-2 py-1 rounded text-[11px]" style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.2)' }}>{c.label}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
