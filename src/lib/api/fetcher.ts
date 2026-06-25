import { prisma } from '@/lib/prisma'
import { fetchProMatches, fetchMatchDetail, filterTIMatches } from './opendota'
import { calculateAllStats } from './calculator'
import type { OpenDotaProMatch } from './opendota'

// All TI 2026 tournament keywords to scan
const TI2026_KEYWORDS = [
  'International 2026',
  'TI 2026',
  'TI2026',
]

export async function updateAllData() {
  console.log('[Fetcher] Starting data update via OpenDota...')
  await ensureAllTournaments()

  try {
    console.log('[Fetcher] Fetching pro matches...')
    const allMatches = await fetchProMatches()
    console.log(`[Fetcher] Got ${allMatches.length} total pro matches`)

    // Filter for ALL TI 2026 qualifiers (not just EU/NA)
    const tiMatches = allMatches.filter(m => {
      const name = m.league_name.toLowerCase()
      return TI2026_KEYWORDS.some(kw => name.includes(kw.toLowerCase())) ||
        // Also catch qualifier matches by known team names
        isTITeam(m.radiant_name) || isTITeam(m.dire_name)
    })

    console.log(`[Fetcher] TI 2026 matches: ${tiMatches.length}`)

    // Group by league name
    const leagues = new Map<string, OpenDotaProMatch[]>()
    for (const m of tiMatches) {
      const league = m.league_name || 'Unknown'
      if (!leagues.has(league)) leagues.set(league, [])
      leagues.get(league)!.push(m)
    }

    console.log(`[Fetcher] Found ${leagues.size} TI leagues:`)
    for (const [name, matches] of leagues) {
      console.log(`  - ${name}: ${matches.length} matches`)
    }

    // Process each league as a tournament
    let tournamentId = 1
    for (const [leagueName, matches] of leagues) {
      // Find or create tournament
      const region = detectRegion(leagueName)
      const tournament = await prisma.tournament.upsert({
        where: { id: tournamentId },
        update: {
          name: leagueName,
          shortName: leagueName.replace('The International 2026: ', 'TI2026 '),
          region,
        },
        create: {
          id: tournamentId,
          name: leagueName,
          shortName: leagueName.replace('The International 2026: ', 'TI2026 '),
          region,
          startDate: new Date('2026-06-09'),
          endDate: new Date('2026-08-30'),
        },
      })

      await processProMatches(matches, tournament.id)
      console.log(`[Fetcher] ${leagueName}: ${matches.length} matches → tournament #${tournamentId}`)
      tournamentId++
    }

    // Fetch picks for recent matches
    await fetchPicksForRecentMatches()
  } catch (e) {
    console.error('[Fetcher] Error:', e)
  }

  await calculateAllStats()
  console.log('[Fetcher] Update complete')
}

const TI_TEAMS = new Set([
  'team spirit', 'nigma galaxy', 'virtus.pro', 'navi', 'natus vincere',
  'mouz', 'yellow submarine', 'parivision', 'team vision', 'power rangers',
  'l1ga team', 'gamerlegion', 'the bug', 'ggb', '4a+i',
  'enjoy', 'team bald', 'modus', 'huligani', 'vp.prodigy', 'rune eaters',
  'ic x insanity', '4ikibamboni', 'og', 'team liquid', 'gaimin gladiators',
  'tundra', 'betboom', 'aurora', 'talon', 'xtreme gaming',
])

function isTITeam(name: string | null): boolean {
  if (!name) return false
  return TI_TEAMS.has(name.toLowerCase().trim())
}

function detectRegion(name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('europe') || lower.includes('eu ')) return 'EU'
  if (lower.includes('north america') || lower.includes('na ')) return 'NA'
  if (lower.includes('south america') || lower.includes('sa ')) return 'SA'
  if (lower.includes('southeast asia') || lower.includes('sea')) return 'SEA'
  if (lower.includes('china') || lower.includes('cn ')) return 'CN'
  if (lower.includes('eastern europe') || lower.includes('eeu')) return 'EEU'
  if (lower.includes('mena')) return 'MENA'
  return 'INTL'
}

async function processProMatches(matches: OpenDotaProMatch[], tournamentId: number) {
  for (const m of matches) {
    const startTime = m.start_time ? new Date(m.start_time * 1000) : null
    const duration = m.duration || null
    const endTime = startTime && duration ? new Date(startTime.getTime() + duration * 1000) : null

    const status = endTime ? 'completed'
      : startTime && startTime.getTime() < Date.now() ? 'live'
      : 'upcoming'

    const winner = m.radiant_win ? 'radiant' : 'dire'

    if (m.radiant_name && m.radiant_team_id) {
      await prisma.team.upsert({
        where: { id: m.radiant_team_id },
        update: { name: m.radiant_name },
        create: { id: m.radiant_team_id, name: m.radiant_name },
      })
    }
    if (m.dire_name && m.dire_team_id) {
      await prisma.team.upsert({
        where: { id: m.dire_team_id },
        update: { name: m.dire_name },
        create: { id: m.dire_team_id, name: m.dire_name },
      })
    }

    await prisma.match.upsert({
      where: { id: m.match_id },
      update: {
        tournamentId,
        radiantTeamId: m.radiant_team_id,
        direTeamId: m.dire_team_id,
        winner,
        radiantScore: m.radiant_score,
        direScore: m.dire_score,
        duration,
        startTime,
        endTime,
        status,
      },
      create: {
        id: m.match_id,
        tournamentId,
        radiantTeamId: m.radiant_team_id,
        direTeamId: m.dire_team_id,
        winner,
        radiantScore: m.radiant_score,
        direScore: m.dire_score,
        duration,
        startTime,
        endTime,
        status,
      },
    })

    if (m.radiant_team_id) {
      const tmId = m.match_id * 10 + 1
      await prisma.teamMatch.upsert({
        where: { id: tmId },
        update: { isWin: winner === 'radiant' },
        create: { id: tmId, matchId: m.match_id, teamId: m.radiant_team_id, side: 'radiant', isWin: winner === 'radiant' },
      })
    }
    if (m.dire_team_id) {
      const tmId = m.match_id * 10 + 2
      await prisma.teamMatch.upsert({
        where: { id: tmId },
        update: { isWin: winner === 'dire' },
        create: { id: tmId, matchId: m.match_id, teamId: m.dire_team_id, side: 'dire', isWin: winner === 'dire' },
      })
    }
  }
}

async function fetchPicksForRecentMatches() {
  const matchesWithoutPicks = await prisma.match.findMany({
    where: { status: 'completed', picks: { none: {} } },
    orderBy: { startTime: 'desc' },
    take: 30,
  })

  console.log(`[Fetcher] Fetching picks for ${matchesWithoutPicks.length} matches...`)
  let count = 0

  for (const match of matchesWithoutPicks) {
    try {
      const detail = await fetchMatchDetail(match.id)
      if (detail.picks_bans && detail.picks_bans.length > 0) {
        for (const pb of detail.picks_bans) {
          if (pb.is_pick) {
            await prisma.matchPick.create({
              data: {
                matchId: match.id,
                heroId: pb.hero_id,
                side: pb.team === 0 ? 'radiant' : 'dire',
                isRadiant: pb.team === 0,
                playerName: null,
              },
            })
            await prisma.hero.upsert({
              where: { id: pb.hero_id },
              update: {},
              create: {
                id: pb.hero_id,
                name: `hero_${pb.hero_id}`,
                localizedName: `Hero ${pb.hero_id}`,
                primaryAttr: 'str',
                attackType: 'Melee',
                roles: '[]',
              },
            })
          }
        }
        count++
      }
      await new Promise(r => setTimeout(r, 200))
    } catch (e) {
      console.warn(`[Fetcher] Failed picks for match ${match.id}`)
    }
  }
  console.log(`[Fetcher] Picks fetched for ${count} matches`)
}

async function ensureAllTournaments() {
  // Keep existing ones
  await prisma.tournament.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'The International 2026: Europe Regional Qualifier',
      shortName: 'TI2026 EU Qualifier',
      region: 'EU',
      startDate: new Date('2026-06-21'),
      endDate: new Date('2026-06-28'),
    },
  })
  await prisma.tournament.upsert({
    where: { id: 2 },
    update: {},
    create: {
      id: 2,
      name: 'The International 2026: North America Closed Qualifier',
      shortName: 'TI2026 NA Qualifier',
      region: 'NA',
      startDate: new Date('2026-06-24'),
      endDate: new Date('2026-06-26'),
    },
  })
}
