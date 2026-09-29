import { NextRequest, NextResponse } from 'next/server'
import { corsHeaders } from '@/middleware/cors'

export function middleware(request: NextRequest) {
  const headers = corsHeaders(request)

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }

  const response = NextResponse.next()
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
  return response
}

export const config = {
  matcher: '/api/:path*',
}
