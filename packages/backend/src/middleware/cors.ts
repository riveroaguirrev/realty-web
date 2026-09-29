import { NextRequest } from 'next/server'

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:5173', 'http://localhost:5174']

function getAllowedOrigins(): string[] {
  const configured = process.env.CORS_ALLOWED_ORIGINS
  return configured ? configured.split(',').map((origin) => origin.trim()) : DEFAULT_ALLOWED_ORIGINS
}

export function corsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin')
  if (!origin || !getAllowedOrigins().includes(origin)) return {}

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  }
}
