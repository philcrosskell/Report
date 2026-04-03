import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  const appUrl = 'https://report-three-xi.vercel.app'

  if (error || !code) {
    return NextResponse.redirect(appUrl + '?gbp_auth=error')
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID ?? ''
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? ''
    const redirectUri = appUrl + '/api/auth/google/callback'

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    })

    const tokenData = await tokenRes.json() as Record<string, string>

    if (!tokenData.access_token) {
      return NextResponse.redirect(appUrl + '?gbp_auth=error')
    }

    // Store tokens in a cookie (httpOnly, secure)
    const response = NextResponse.redirect(appUrl + '?gbp_auth=success')
    response.cookies.set('gbp_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: true,
      maxAge: 3600,
      path: '/',
    })
    if (tokenData.refresh_token) {
      response.cookies.set('gbp_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: true,
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      })
    }
    return response
  } catch {
    return NextResponse.redirect(appUrl + '?gbp_auth=error')
  }
}
