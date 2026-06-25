import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { SEED_TEAMS } from '@/lib/static-data'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    const now = new Date()
    let dateFilter: Date | null = null
    if (period === 'day') dateFilter = new Date(now.getTime() - 24*60*60*1000)
    else if (period === 'week') dateFilter = new Date(now.getTime() - 7*24*60*60*1000)
    else if (period === 'month') dateFilter = new Date(now.getTime() - 30*24*60*60*1000)

    const teams = await prisma.team.findMany({
      include: {
        teamStats: true,
        matches: { include: { match: { include: { picks: true } } }, where: { match: { status: 'completed', ...(dateFilter ? { startTime: { gte: dateFilter } } : {}) } } },
      },
    })

    if (teams.length === 0) throw new Error('no teams')

    const enriched = teams.map(t => {
      const stat = t.teamStats[0]
      const heroPicks = new Map<number, { picks: number; wins: number }>()
      for (const tm of t.matches) {
        for (const pick of tm.match.picks) {
          if ((pick.isRadiant && tm.side === 'radiant') || (!pick.isRadiant && tm.side === 'dire')) {
            const e = heroPicks.get(pick.heroId) || { picks: 0, wins: 0 }
            e.picks++; const isWin = (pick.isRadiant && tm.match.winner === 'radiant') || (!pick.isRadiant && tm.match.winner === 'dire')
            if (isWin) e.wins++; heroPicks.set(pick.heroId, e)
          }
        }
      }
      const topHeroes = Array.from(heroPicks.entries()).sort((a,b) => b[1].picks - a[1].picks).slice(0,5)
      return {
        id: t.id, name: t.name, tag: t.tag || '', region: t.region || 'Unknown',
        stats: { matches: stat?.matches || 0, wins: stat?.wins || 0, losses: stat?.losses || 0, winRate: stat?.winRate || 0, recentForm: stat?.recentForm || '' },
        topHeroes: topHeroes.map(([hid,d]) => ({ heroId: hid, heroName: `Hero ${hid}`, picks: d.picks, wins: d.wins, wr: d.picks > 0 ? d.wins/d.picks : 0 })),
      }
    })
    return NextResponse.json({ teams: enriched })
  } catch {
    return NextResponse.json({ teams: SEED_TEAMS.map(t => ({ id: t.id, name: t.name, tag: t.tag || '', region: t.region || 'Unknown', stats: { matches: 0, wins: 0, losses: 0, winRate: 0, recentForm: '' }, topHeroes: [] })) })
  }
}
