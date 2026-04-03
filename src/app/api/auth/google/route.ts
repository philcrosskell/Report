import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
  const redirectUri = process.env.NEXT_PUBLIC_APP_URL
    ? process.env.NEXT_PUBLIC_APP_URL + '/api/auth/google/callback'
    : 'https://report-three-xi.vercel.app/api/auth/google/callback'

  const scope = [
    'https://www.googleapis.com/auth/business.manage',
  ].join(' ')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope,
    access_type: 'offline',
    prompt: 'consent',
  })

  return NextResponse.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + params.toString())
}
