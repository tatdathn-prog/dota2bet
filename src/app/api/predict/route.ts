import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDb } from '@/lib/db-init'
import { predictMatch, type TeamMetrics, type HeroComfort } from '@/lib/stats/predictor'

export async function GET() {
  await ensureDb()
  try {
    // Get upcoming matches
    const upcomingMatches = await prisma.match.findMany({
      where: { status: { in: ['upcoming', 'live'] } },
      include: {
        radiantTeam: true,
        direTeam: true,
        tournament: true,
        picks: true,
      },
      orderBy: { startTime: 'asc' },
      take: 20,
    })

    const predictions = await Promise.all(
      upcomingMatches.map(async (match) => {
        // Get team metrics
        const radiantTeam = await getTeamMetrics(match.radiantTeamId)
        const direTeam = await getTeamMetrics(match.direTeamId)

        // Get hero comfort for already-drafted heroes
        const radiantHeroes = await getHeroComfort(
          match.radiantTeamId,
          match.picks.filter(p => p.isRadiant).map(p => p.heroId)
        )
        const direHeroes = await getHeroComfort(
          match.direTeamId,
          match.picks.filter(p => !p.isRadiant).map(p => p.heroId)
        )

        // Get combos
        const radiantCombos = await getTeamCombos(
          match.radiantTeamId,
          match.picks.filter(p => p.isRadiant).map(p => p.heroId)
        )
        const direCombos = await getTeamCombos(
          match.direTeamId,
          match.picks.filter(p => !p.isRadiant).map(p => p.heroId)
        )

        // Run prediction
        const prediction = predictMatch({
          radiantTeam,
          direTeam,
          radiantHeroes,
          direHeroes,
          radiantCombos,
          direCombos,
        })

        return {
          matchId: match.id,
          radiantTeam: match.radiantTeam?.name || 'TBD',
          direTeam: match.direTeam?.name || 'TBD',
          tournament: match.tournament.shortName,
          startTime: match.startTime?.toISOString() || null,
          status: match.status,
          prediction: {
            radiantWinProb: prediction.radiantWinProb,
            direWinProb: prediction.direWinProb,
            confidence: prediction.confidence,
            breakdown: prediction.breakdown,
            keyFactors: prediction.keyFactors,
          },
        }
      })
    )

    return NextResponse.json({ predictions })
  } catch (e) {
    console.error('[Predict API] Error:', e)
    return NextResponse.json({ predictions: [], error: String(e) })
  }
}

async function getTeamMetrics(teamId: number | null): Promise<TeamMetrics> {
  if (!teamId) {
    return { teamId: 0, teamName: 'Unknown', matches: 0, wins: 0, shrunkWR: 0.5, confidence: 0, recentWR: 0.5 }
  }

  const stat = await prisma.teamStat.findFirst({
    where: { teamId, tournamentId: 0 },
    include: { team: true },
  })

  if (!stat) {
    const team = await prisma.team.findUnique({ where: { id: teamId } })
    return {
      teamId,
      teamName: team?.name || 'Unknown',
      matches: 0, wins: 0, shrunkWR: 0.5, confidence: 0, recentWR: 0.5,
    }
  }

  return {
    teamId,
    teamName: stat.team.name,
    matches: stat.matches,
    wins: stat.wins,
    shrunkWR: stat.winRate, // Already Bayesian in calculator
    confidence: stat.matches / (10 + stat.matches),
    recentWR: stat.winRate,
  }
}

async function getHeroComfort(teamId: number | null, heroIds: number[]): Promise<HeroComfort[]> {
  if (!teamId || heroIds.length === 0) return []

  const comfort: HeroComfort[] = []
  for (const heroId of heroIds) {
    // Find matches where this team picked this hero
    const teamMatches = await prisma.teamMatch.findMany({
      where: { teamId },
      include: {
        match: {
          include: {
            picks: {
              where: { heroId },
            },
          },
        },
      },
    })

    let picks = 0
    let wins = 0
    for (const tm of teamMatches) {
      if (tm.match.picks.length > 0) {
        picks++
        if (tm.isWin) wins++
      }
    }

    const hero = await prisma.hero.findUnique({ where: { id: heroId } })

    comfort.push({
      heroId,
      heroName: hero?.localizedName || `Hero ${heroId}`,
      teamPicks: picks,
      teamWins: wins,
      comfortScore: picks > 0 ? wins / picks : 0,
    })
  }

  return comfort
}

async function getTeamCombos(teamId: number | null, heroIds: number[]): Promise<Array<{ hero1: number; hero2: number; wr: number; games: number }>> {
  if (!teamId || heroIds.length < 2) return []

  const combos: Array<{ hero1: number; hero2: number; wr: number; games: number }> = []

  for (let i = 0; i < heroIds.length; i++) {
    for (let j = i + 1; j < heroIds.length; j++) {
      const a = Math.min(heroIds[i], heroIds[j])
      const b = Math.max(heroIds[i], heroIds[j])

      const existing = await prisma.comboStat.findFirst({
        where: { hero1Id: a, hero2Id: b, tournamentId: 0 },
      })

      if (existing && existing.matches >= 1) {
        combos.push({
          hero1: a,
          hero2: b,
          wr: existing.winRate,
          games: existing.matches,
        })
      }
    }
  }

  return combos
}

export const dynamic = 'force-dynamic'
