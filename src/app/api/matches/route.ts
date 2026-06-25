import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      include: {
        radiantTeam: true,
        direTeam: true,
        tournament: true,
        picks: {
          include: {
            radiantHero: true,
            direHero: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    })

    const formatted = matches.map(m => ({
      id: m.id,
      radiantTeam: m.radiantTeam?.name || m.radiantTeam?.tag || 'Radiant',
      direTeam: m.direTeam?.name || m.direTeam?.tag || 'Dire',
      radiantScore: m.radiantScore,
      direScore: m.direScore,
      winner: m.winner,
      status: m.status,
      stage: m.stage,
      duration: m.duration ? `${Math.floor(m.duration / 60)}:${String(m.duration % 60).padStart(2, '0')}` : null,
      startTime: m.startTime ? new Date(m.startTime).toLocaleString() : 'TBD',
      tournament: m.tournament.shortName,
      picks: m.picks.map(p => {
        const hero = p.radiantHero || p.direHero
        return {
          heroId: p.heroId,
          heroName: hero?.localizedName || `Hero ${p.heroId}`,
          heroImg: hero?.imageUrl || '',
          side: p.side,
        }
      }),
    }))

    return NextResponse.json({ matches: formatted })
  } catch (e) {
    return NextResponse.json({ matches: [] })
  }
}
