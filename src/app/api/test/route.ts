import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'API is working',
    hasApiKey: !!process.env.DASHSCOPE_API_KEY,
    timestamp: new Date().toISOString()
  })
}

export async function POST() {
  return NextResponse.json({
    status: 'ok',
    message: 'POST API is working',
    hasApiKey: !!process.env.DASHSCOPE_API_KEY,
    timestamp: new Date().toISOString()
  })
}
