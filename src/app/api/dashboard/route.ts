import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDb } from '@/lib/db-init'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all'
    
    // Calculate date filter for match-based queries
    const now = new Date()
    let dateFilter: Date | undefined
    if (period === 'day') dateFilter = new Date(now.getTime() - 24*60*60*1000)
    else if (period === 'week') dateFilter = new Date(now.getTime() - 7*24*60*60*1000)
    else if (period === 'month') dateFilter = new Date(now.getTime() - 30*24*60*60*1000)

    const matchWhere = dateFilter ? { startTime: { gte: dateFilter } } : {}
    // Upcoming matches (status upcoming, sorted by time)
    const upcomingMatches = await prisma.match.findMany({
      where: { status: { in: ['upcoming', 'live'] } },
      include: { radiantTeam: true, direTeam: true, tournament: true },
      orderBy: { startTime: 'asc' },
      take: 20,
    })

    // Top heroes by win rate (minimum 3 picks)
    const heroStats = await prisma.heroStat.findMany({
      where: { matches: { gte: 3 }, position: "" },
      include: { hero: true },
      orderBy: { winRate: 'desc' },
      take: 10,
    })

    // Top combos (minimum 3 matches)
    const combos = await prisma.comboStat.findMany({
      where: { matches: { gte: 3 } },
      orderBy: { winRate: 'desc' },
      take: 10,
    })

    // Top teams
    const teamStats = await prisma.teamStat.findMany({
      where: { matches: { gte: 1 } },
      include: { team: true },
      orderBy: { winRate: 'desc' },
      take: 10,
    })

    // Get last updated match
    const lastMatch = await prisma.match.findFirst({
      where: { status: 'completed' },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({
      upcomingMatches: upcomingMatches.map(m => ({
        id: m.id,
        radiant: m.radiantTeam?.name || m.radiantTeam?.tag || 'TBD',
        dire: m.direTeam?.name || m.direTeam?.tag || 'TBD',
        tournament: m.tournament.shortName,
        time: m.startTime ? new Date(m.startTime).toLocaleString() : 'TBD',
      })),
      topHeroes: heroStats.map(s => ({
        heroId: s.heroId,
        heroName: s.hero.localizedName,
        winRate: s.winRate,
        picks: s.picks,
      })),
      topCombos: await Promise.all(combos.map(async c => {
        const h1 = await prisma.hero.findUnique({ where: { id: c.hero1Id } })
        const h2 = await prisma.hero.findUnique({ where: { id: c.hero2Id } })
        return {
          hero1: h1?.localizedName || `Hero ${c.hero1Id}`,
          hero2: h2?.localizedName || `Hero ${c.hero2Id}`,
          winRate: c.winRate,
          matches: c.matches,
        }
      })),
      topTeams: teamStats.map(s => ({
        id: s.teamId,
        name: s.team.name,
        winRate: s.winRate,
        record: `${s.wins}W-${s.losses}L`,
        form: s.recentForm || '',
      })),
      lastUpdated: lastMatch?.updatedAt?.toISOString() || new Date().toISOString(),
    })
  } catch (e) {
    return NextResponse.json({
      upcomingMatches: [],
      topHeroes: [],
      topCombos: [],
      topTeams: [],
      lastUpdated: new Date().toISOString(),
    })
  }
}
