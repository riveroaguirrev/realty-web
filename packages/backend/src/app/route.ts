import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    message: 'Realty Platform API',
    version: '1.0.0',
  })
}
