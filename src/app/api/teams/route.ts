import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    
    // Calculate date filter
    const now = new Date()
    let dateFilter: Date | null = null
    if (period === 'day') dateFilter = new Date(now.getTime() - 24*60*60*1000)
    else if (period === 'week') dateFilter = new Date(now.getTime() - 7*24*60*60*1000)
    else if (period === 'month') dateFilter = new Date(now.getTime() - 30*24*60*60*1000)

    const teams = await prisma.team.findMany({
      include: {
        teamStats: true,
        matches: {
          include: {
            match: { include: { picks: true } },
          },
          where: {
            match: {
              status: 'completed',
              ...(dateFilter ? { startTime: { gte: dateFilter } } : {}),
            },
          },
        },
      },
    })

    const enriched = teams.map(t => {
      const stat = t.teamStats[0]
      // Get most picked heroes for this team
      const heroPicks = new Map<number, { picks: number; wins: number }>()
      for (const tm of t.matches) {
        for (const pick of tm.match.picks) {
          if (
            (pick.isRadiant && tm.side === 'radiant') ||
            (!pick.isRadiant && tm.side === 'dire')
          ) {
            const entry = heroPicks.get(pick.heroId) || { picks: 0, wins: 0 }
            entry.picks++
            const isWin =
              (pick.isRadiant && tm.match.winner === 'radiant') ||
              (!pick.isRadiant && tm.match.winner === 'dire')
            if (isWin) entry.wins++
            heroPicks.set(pick.heroId, entry)
          }
        }
      }

      const topHeroes = Array.from(heroPicks.entries())
        .sort((a, b) => b[1].picks - a[1].picks)
        .slice(0, 5)

      return {
        id: t.id,
        name: t.name,
        tag: t.tag || '',
        region: t.region || 'Unknown',
        stats: {
          matches: stat?.matches || 0,
          wins: stat?.wins || 0,
          losses: stat?.losses || 0,
          winRate: stat?.winRate || 0,
          recentForm: stat?.recentForm || '',
        },
        topHeroes: topHeroes.map(([heroId, data]) => ({
          heroId,
          heroName: `Hero ${heroId}`, // will be enriched on frontend if needed
          picks: data.picks,
          wins: data.wins,
          wr: data.picks > 0 ? data.wins / data.picks : 0,
        })),
      }
    })

    return NextResponse.json({ teams: enriched })
  } catch (e) {
    return NextResponse.json({ teams: [] })
  }
}
