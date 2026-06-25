import { NextResponse } from 'next/server'
import { updateAllData } from '@/lib/api/fetcher'

export async function POST() {
  try {
    await updateAllData()
    return NextResponse.json({ success: true, timestamp: new Date().toISOString() })
  } catch (e) {
    return NextResponse.json({ success: false, error: String(e) }, { status: 500 })
  }
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
