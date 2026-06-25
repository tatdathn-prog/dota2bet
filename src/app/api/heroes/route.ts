import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SEED_HEROES, SEED_TEAMS, SEED_TOURNAMENTS } from '@/lib/static-data'

export async function GET() {
  try {
    // Try Prisma first for enriched data
    const heroes = await prisma.hero.findMany({ include: { heroStats: true } })
    if (heroes.length > 0) {
      const enriched = heroes.map(h => ({
        id: h.id, name: h.localizedName, img: h.imageUrl || '',
        roles: JSON.parse(h.roles || '[]'),
        stats: {
          carry: { picks: 0, wins: 0, wr: 0 },
          mid: { picks: 0, wins: 0, wr: 0 },
          offlane: { picks: 0, wins: 0, wr: 0 },
          support: { picks: 0, wins: 0, wr: 0 },
        },
        overall: { picks: 0, wins: 0, wr: 0, bans: 0 },
      }))
      return NextResponse.json({ heroes: enriched })
    }
  } catch {}

  // Fallback: static seed data
  return NextResponse.json({ heroes: SEED_HEROES })
}

// Also export teams and tournaments via separate handlers if needed
export { SEED_TEAMS, SEED_TOURNAMENTS }
