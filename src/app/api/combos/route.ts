import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDb } from '@/lib/db-init'

export async function GET() {
  await ensureDb()
  try {
    const combos = await prisma.comboStat.findMany({
      where: { matches: { gte: 1 } },
      orderBy: { winRate: 'desc' },
      take: 200,
    })

    const enriched = await Promise.all(combos.map(async c => {
      const h1 = await prisma.hero.findUnique({ where: { id: c.hero1Id } })
      const h2 = await prisma.hero.findUnique({ where: { id: c.hero2Id } })
      return {
        hero1Id: c.hero1Id,
        hero2Id: c.hero2Id,
        hero1Name: h1?.localizedName || `Hero ${c.hero1Id}`,
        hero2Name: h2?.localizedName || `Hero ${c.hero2Id}`,
        hero1Img: h1?.imageUrl || '',
        hero2Img: h2?.imageUrl || '',
        matches: c.matches,
        wins: c.wins,
        winRate: c.winRate,
      }
    }))

    return NextResponse.json({ combos: enriched })
  } catch (e) {
    return NextResponse.json({ combos: [] })
  }
}
