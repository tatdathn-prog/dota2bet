import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDb } from '@/lib/db-init'

export async function GET() {
  await ensureDb()
  try {
    const heroes = await prisma.hero.findMany({
      include: { heroStats: true },
    })

    const enriched = heroes.map(h => {
      const overall = h.heroStats.find(s => s.position === "")
      const carry = h.heroStats.find(s => s.position === 'carry')
      const mid = h.heroStats.find(s => s.position === 'mid')
      const offlane = h.heroStats.find(s => s.position === 'offlane')
      const support = h.heroStats.find(s => s.position === 'support')

      return {
        id: h.id,
        name: h.localizedName,
        img: h.imageUrl || '',
        roles: JSON.parse(h.roles || '[]'),
        stats: {
          carry: { picks: carry?.picks || 0, wins: carry?.wins || 0, wr: carry?.winRate || 0 },
          mid: { picks: mid?.picks || 0, wins: mid?.wins || 0, wr: mid?.winRate || 0 },
          offlane: { picks: offlane?.picks || 0, wins: offlane?.wins || 0, wr: offlane?.winRate || 0 },
          support: { picks: support?.picks || 0, wins: support?.wins || 0, wr: support?.winRate || 0 },
        },
        overall: {
          picks: overall?.picks || 0,
          wins: overall?.wins || 0,
          wr: overall?.winRate || 0,
          bans: overall?.bans || 0,
        },
      }
    })

    return NextResponse.json({ heroes: enriched })
  } catch (e) {
    return NextResponse.json({ heroes: [] })
  }
}
