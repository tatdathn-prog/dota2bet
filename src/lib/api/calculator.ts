import { prisma } from '@/lib/prisma'
import { bayesianWinrate } from '@/lib/stats/bayesian'
import { weightedWinrate } from '@/lib/stats/recency'

export async function calculateAllStats() {
  console.log('[Calculator] Computing advanced stats...')
  await calculateHeroStats()
  await calculateTeamStats()
  await calculateComboStats()
  console.log('[Calculator] Stats computed')
}

async function calculateHeroStats() {
  const picks = await prisma.matchPick.findMany({
    where: { match: { status: 'completed' } },
    include: {
      match: true,
      radiantHero: true,
      direHero: true,
    },
  })

  // Use the hero from either relation
  const heroMap = new Map<number, { picks: number; wins: number; bans: number; matches: Array<{ date: Date; isWin: boolean }> }>()

  for (const pick of picks) {
    const entry = heroMap.get(pick.heroId) || { picks: 0, wins: 0, bans: 0, matches: [] }
    entry.picks++
    const isWin =
      (pick.isRadiant && pick.match.winner === 'radiant') ||
      (!pick.isRadiant && pick.match.winner === 'dire')
    if (isWin) entry.wins++
    entry.matches.push({ date: pick.match.startTime || new Date(), isWin })
    heroMap.set(pick.heroId, entry)
  }

  for (const [heroId, stats] of heroMap) {
    // Raw win rate
    const rawWR = stats.picks > 0 ? stats.wins / stats.picks : 0

    // Bayesian shrinkage
    const bayesian = bayesianWinrate(stats.wins, stats.picks, 10, 0.50)

    // Recency-weighted
    const weighted = weightedWinrate(stats.matches)

    await prisma.heroStat.upsert({
      where: { heroId_position_tournamentId: { heroId, position: '', tournamentId: 0 } },
      update: {
        matches: stats.picks,
        wins: stats.wins,
        picks: stats.picks,
        bans: stats.bans,
        winRate: bayesian.shrunkWR, // Use Bayesian shrunk WR
      },
      create: {
        heroId,
        position: '',
        matches: stats.picks,
        wins: stats.wins,
        picks: stats.picks,
        bans: stats.bans,
        winRate: bayesian.shrunkWR,
        tournamentId: 0,
      },
    })
  }
}

async function calculateTeamStats() {
  const teams = await prisma.team.findMany({
    include: {
      matches: {
        include: { match: true },
      },
    },
  })

  for (const team of teams) {
    const completedMatches = team.matches
      .filter(m => m.match.status === 'completed')
      .sort((a, b) => (b.match.endTime?.getTime() || 0) - (a.match.endTime?.getTime() || 0))

    const wins = completedMatches.filter(m => m.isWin).length
    const total = completedMatches.length

    // Bayesian winrate for team
    const bayesian = bayesianWinrate(wins, total, 10, 0.50)

    // Recent form (last 5)
    const recent = completedMatches
      .slice(0, 5)
      .map(m => (m.isWin ? 'W' : 'L'))
      .join('')

    // Recent WR (last 10 games)
    const recentMatches = completedMatches.slice(0, 10)
    const recentWins = recentMatches.filter(m => m.isWin).length
    const recentWR = recentMatches.length > 0 ? recentWins / recentMatches.length : 0

    await prisma.teamStat.upsert({
      where: { teamId_tournamentId: { teamId: team.id, tournamentId: 0 } },
      update: {
        matches: total,
        wins,
        losses: total - wins,
        winRate: bayesian.shrunkWR, // Bayesian estimate
        recentForm: recent,
      },
      create: {
        teamId: team.id,
        matches: total,
        wins,
        losses: total - wins,
        winRate: bayesian.shrunkWR,
        recentForm: recent,
        tournamentId: 0,
      },
    })
  }
}

async function calculateComboStats() {
  const matches = await prisma.match.findMany({
    where: { status: 'completed' },
    include: { picks: true },
  })

  const comboMap = new Map<string, { matches: number; wins: number }>()

  for (const match of matches) {
    const radiantHeroes = match.picks.filter(p => p.isRadiant).map(p => p.heroId)
    const direHeroes = match.picks.filter(p => !p.isRadiant).map(p => p.heroId)
    const radiantWon = match.winner === 'radiant'

    for (let i = 0; i < radiantHeroes.length; i++) {
      for (let j = i + 1; j < radiantHeroes.length; j++) {
        const key = makeComboKey(radiantHeroes[i], radiantHeroes[j])
        const entry = comboMap.get(key) || { matches: 0, wins: 0 }
        entry.matches++
        if (radiantWon) entry.wins++
        comboMap.set(key, entry)
      }
    }
    for (let i = 0; i < direHeroes.length; i++) {
      for (let j = i + 1; j < direHeroes.length; j++) {
        const key = makeComboKey(direHeroes[i], direHeroes[j])
        const entry = comboMap.get(key) || { matches: 0, wins: 0 }
        entry.matches++
        if (!radiantWon) entry.wins++
        comboMap.set(key, entry)
      }
    }
  }

  const topCombos = Array.from(comboMap.entries())
    .sort((a, b) => b[1].matches - a[1].matches)
    .slice(0, 200)

  for (const [key, stats] of topCombos) {
    const [h1, h2] = key.split('_').map(Number)
    // Bayesian shrinkage for combos too (stronger prior since combos have fewer samples)
    const bayesian = bayesianWinrate(stats.wins, stats.matches, 5, 0.50)

    await prisma.comboStat.upsert({
      where: { hero1Id_hero2Id_tournamentId: { hero1Id: h1, hero2Id: h2, tournamentId: 0 } },
      update: { matches: stats.matches, wins: stats.wins, winRate: bayesian.shrunkWR },
      create: {
        hero1Id: h1,
        hero2Id: h2,
        matches: stats.matches,
        wins: stats.wins,
        winRate: bayesian.shrunkWR,
        tournamentId: 0,
      },
    })
  }
}

function makeComboKey(a: number, b: number): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`
}
