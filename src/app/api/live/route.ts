import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureDb } from '@/lib/db-init'

const OPENDOTA_LIVE = 'https://api.opendota.com/api/live'

// In-memory timeline storage (max 180 snapshots per match = 45 min at 15s interval)
const timelineStore = new Map<string, Array<{time: number, radiantLead: number, radiantScore: number, direScore: number}>>()
const MAX_SNAPSHOTS = 180

export async function GET() {
  await ensureDb()
  try {
    const res = await fetch(OPENDOTA_LIVE)
    if (!res.ok) return NextResponse.json({ matches: [] })
    
    const raw = await res.json()
    
    // Filter: only pro matches (have league_id, team names, lobby_type=1)
    // AND filter out deactivated (finished) matches
    const proMatches = raw.filter((m: any) => 
      m.league_id > 0 && 
      m.team_name_radiant && 
      m.team_name_dire &&
      m.players?.length >= 10 &&
      m.deactivate_time === 0 // Only truly live (not yet deactivated)
    )
    
    // Filter for TI-related leagues
    const tiMatches = proMatches.filter((m: any) => {
      // We check league IDs we know, or team names from TI qualifiers
      const tiTeams = [
        'Team Spirit', 'Nigma Galaxy', 'Virtus.pro', 'NAVI', 'MOUZ',
        'Yellow Submarine', 'PARIVISION', 'Power Rangers', 'L1GA TEAM',
        'GamerLegion', 'The Bug', 'GGB', 'Natus Vincere', 'TEAM VISION',
        'enjoy', 'Team Bald', 'MODUS', 'HULIGANI', 'VP.Prodigy', 'Rune Eaters'
      ]
      return tiTeams.some((t: string) => 
        m.team_name_radiant?.includes(t) || m.team_name_dire?.includes(t)
      )
    })
    
    // Also include other pro matches (could be non-TI but pro level)
    const allPro = tiMatches.length > 0 ? tiMatches : proMatches.slice(0, 5)
    
    // Enrich with hero names
    const enriched = await Promise.all(allPro.map(async (m: any) => {
      const radiantPlayers = m.players?.filter((p: any) => p.team === 0) || []
      const direPlayers = m.players?.filter((p: any) => p.team === 1) || []
      
      const radiantHeroes = await Promise.all(
        radiantPlayers.map(async (p: any) => {
          const hero = await prisma.hero.findUnique({ where: { id: p.hero_id } })
          return {
            heroId: p.hero_id,
            heroName: hero?.localizedName || `Hero ${p.hero_id}`,
            heroImg: hero?.imageUrl || '',
            playerName: p.name || `Player ${p.account_id}`,
            accountId: p.account_id,
          }
        })
      )
      
      const direHeroes = await Promise.all(
        direPlayers.map(async (p: any) => {
          const hero = await prisma.hero.findUnique({ where: { id: p.hero_id } })
          return {
            heroId: p.hero_id,
            heroName: hero?.localizedName || `Hero ${p.hero_id}`,
            heroImg: hero?.imageUrl || '',
            playerName: p.name || `Player ${p.account_id}`,
            accountId: p.account_id,
          }
        })
      )
      
      // Determine status
      const hasHeroes = m.players?.some((p: any) => p.hero_id > 0)
      const allHeroesPicked = radiantPlayers.length === 5 && direPlayers.length === 5 &&
        radiantPlayers.every((p: any) => p.hero_id > 0) &&
        direPlayers.every((p: any) => p.hero_id > 0)
      
      let status = 'drafting'
      if (allHeroesPicked && m.game_time > 0) status = 'in_progress'
      else if (allHeroesPicked && m.game_time <= 0) status = 'draft_complete'
      else if (hasHeroes && !allHeroesPicked) status = 'drafting'
      else status = 'waiting'
      
      // Clean team names first
      const cleanName = (name: string) => name?.replace(/^_+/, '').trim() || name
      const cleanRadiant = cleanName(m.team_name_radiant)
      const cleanDire = cleanName(m.team_name_dire)

      // Run prediction + commentary + live analysis
      let prediction = null
      let commentary = null
      let liveAnalysis = null
      if (allHeroesPicked && m.team_id_radiant && m.team_id_dire) {
        prediction = await getLivePrediction(
          m.team_id_radiant, cleanRadiant,
          m.team_id_dire, cleanDire,
          radiantPlayers.map((p: any) => p.hero_id),
          direPlayers.map((p: any) => p.hero_id)
        )
        
        // Full live analysis with dynamic win probability
        if (m.game_time > 0 || m.radiant_score > 0 || m.dire_score > 0) {
          liveAnalysis = await getLiveAnalysis(
            m.match_id, cleanRadiant, cleanDire,
            m.team_id_radiant, m.team_id_dire,
            m.radiant_score, m.dire_score, m.radiant_lead,
            m.game_time, status,
            radiantPlayers.map((p: any) => p.hero_id),
            direPlayers.map((p: any) => p.hero_id),
            radiantHeroes, direHeroes
          )
        }
        
        commentary = await generateLiveCommentary(
          m.team_id_radiant, cleanRadiant,
          m.team_id_dire, cleanDire,
          radiantPlayers.map((p: any) => p.hero_id),
          direPlayers.map((p: any) => p.hero_id),
          prediction,
          radiantHeroes,
          direHeroes
        )
      }

      // Store timeline snapshot
      const matchKey = String(m.match_id)
      if (!timelineStore.has(matchKey)) timelineStore.set(matchKey, [])
      const snapshots = timelineStore.get(matchKey)!
      snapshots.push({
        time: m.game_time,
        radiantLead: m.radiant_lead,
        radiantScore: m.radiant_score,
        direScore: m.dire_score,
      })
      if (snapshots.length > MAX_SNAPSHOTS) snapshots.shift()
      
      return {
        matchId: m.match_id,
        radiantTeam: cleanRadiant,
        direTeam: cleanDire,
        timeline: snapshots.map(s => ({...s})),
        radiantTeamId: m.team_id_radiant,
        direTeamId: m.team_id_dire,
        radiantScore: m.radiant_score,
        direScore: m.dire_score,
        radiantLead: m.radiant_lead,
        gameTime: m.game_time,
        spectators: m.spectators,
        status,
        leagueId: m.league_id,
        radiantHeroes,
        direHeroes,
        prediction,
        commentary,
        liveAnalysis,
        lastUpdate: new Date().toISOString(),
      }
    }))
    
    return NextResponse.json({ matches: enriched, total: enriched.length })
  } catch (e) {
    console.error('[Live API] Error:', e)
    return NextResponse.json({ matches: [], error: String(e) })
  }
}

async function getLivePrediction(
  radiantId: number, radiantName: string,
  direId: number, direName: string,
  radiantHeroIds: number[], direHeroIds: number[]
) {
  const { predictMatch } = await import('@/lib/stats/predictor')

  const radiantStat = await prisma.teamStat.findFirst({
    where: { teamId: radiantId, tournamentId: 0 },
  })
  const direStat = await prisma.teamStat.findFirst({
    where: { teamId: direId, tournamentId: 0 },
  })

  const getComfort = async (teamId: number, heroIds: number[]) => {
    return Promise.all(heroIds.map(async (hid) => {
      const hero = await prisma.hero.findUnique({ where: { id: hid } })
      const tms = await prisma.teamMatch.count({
        where: {
          teamId,
          match: {
            status: 'completed',
            picks: { some: { heroId: hid } },
          },
        },
      })
      const wins = await prisma.teamMatch.count({
        where: {
          teamId,
          isWin: true,
          match: {
            status: 'completed',
            picks: { some: { heroId: hid } },
          },
        },
      })
      return {
        heroId: hid,
        heroName: hero?.localizedName || `Hero ${hid}`,
        teamPicks: tms,
        teamWins: wins,
        comfortScore: tms > 0 ? wins / tms : 0,
      }
    }))
  }

  const getCombos = async (heroIds: number[]) => {
    const combos: Array<{ hero1: number; hero2: number; wr: number; games: number }> = []
    for (let i = 0; i < heroIds.length; i++) {
      for (let j = i + 1; j < heroIds.length; j++) {
        const a = Math.min(heroIds[i], heroIds[j])
        const b = Math.max(heroIds[i], heroIds[j])
        const c = await prisma.comboStat.findFirst({
          where: { hero1Id: a, hero2Id: b, tournamentId: 0 },
        })
        if (c && c.matches > 0) combos.push({ hero1: a, hero2: b, wr: c.winRate, games: c.matches })
      }
    }
    return combos
  }

  const radiantComfort = await getComfort(radiantId, radiantHeroIds)
  const direComfort = await getComfort(direId, direHeroIds)
  const radiantCombos = await getCombos(radiantHeroIds)
  const direCombos = await getCombos(direHeroIds)

  const result = predictMatch({
    radiantTeam: {
      teamId: radiantId, teamName: radiantName,
      matches: radiantStat?.matches || 0,
      wins: radiantStat?.wins || 0,
      shrunkWR: radiantStat?.winRate || 0.5,
      confidence: (radiantStat?.matches || 0) / (10 + (radiantStat?.matches || 0)),
      recentWR: radiantStat?.winRate || 0.5,
    },
    direTeam: {
      teamId: direId, teamName: direName,
      matches: direStat?.matches || 0,
      wins: direStat?.wins || 0,
      shrunkWR: direStat?.winRate || 0.5,
      confidence: (direStat?.matches || 0) / (10 + (direStat?.matches || 0)),
      recentWR: direStat?.winRate || 0.5,
    },
    radiantHeroes: radiantComfort,
    direHeroes: direComfort,
    radiantCombos,
    direCombos,
  })

  return {
    radiantWinProb: result.radiantWinProb,
    direWinProb: result.direWinProb,
    confidence: result.confidence,
    keyFactors: result.keyFactors,
  }
}

async function generateLiveCommentary(
  radiantId: number, radiantName: string,
  direId: number, direName: string,
  radiantHeroIds: number[], direHeroIds: number[],
  prediction: any,
  radiantHeroes: any[], direHeroes: any[]
) {
  const { generateCommentary } = await import('@/lib/stats/commentary')
  const { bayesianWinrate } = await import('@/lib/stats/bayesian')

  const radStats = await prisma.teamStat.findFirst({ where: { teamId: radiantId, tournamentId: 0 } })
  const dirStats = await prisma.teamStat.findFirst({ where: { teamId: direId, tournamentId: 0 } })

  // Detect hero position from roles (0=Carry, 1=Mid, 2=Offlane, 3=SoftSupp, 4=HardSupp)
  const detectPosition = (roles: string[]): number => {
    if (roles.includes('Carry')) return 0
    if (roles.includes('Nuker') && !roles.includes('Support')) return 1
    if ((roles.includes('Initiator') || roles.includes('Durable')) && !roles.includes('Support')) return 2
    if (roles.includes('Escape') && !roles.includes('Support') && !roles.includes('Carry')) return 2
    return 3 // Default to support
  }

  const buildHero = async (heroId: number) => {
    const h = await prisma.hero.findUnique({ where: { id: heroId } })
    const stat = await prisma.heroStat.findFirst({ where: { heroId, position: '', tournamentId: 0 } })
    const roles = h?.roles ? JSON.parse(h.roles) : []
    return {
      heroId,
      heroName: h?.localizedName || `Hero ${heroId}`,
      position: detectPosition(roles),
      comfortScore: stat?.winRate || 0.5,
      globalWR: stat?.winRate || 0.5,
    }
  }

  const radDraft = await Promise.all(radiantHeroes.map((h: any) => buildHero(h.heroId)))
  const direDraft = await Promise.all(direHeroes.map((h: any) => buildHero(h.heroId)))

  return generateCommentary({
    radiantTeam: radiantName,
    direTeam: direName,
    radiantTeamWR: radStats?.winRate || 0.5,
    direTeamWR: dirStats?.winRate || 0.5,
    radiantHeroes: radDraft,
    direHeroes: direDraft,
    prediction: {
      radiantWinProb: prediction.radiantWinProb,
      direWinProb: prediction.direWinProb,
      keyFactors: prediction.keyFactors || [],
    },
    format: 'bo3',
  })
}

async function getLiveAnalysis(
  matchId: string, radiantName: string, direName: string,
  radiantId: number, direId: number,
  radiantScore: number, direScore: number,
  radiantLead: number, gameTime: number,
  status: string,
  radiantHeroIds: number[], direHeroIds: number[],
  radiantHeroes: any[], direHeroes: any[]
) {
  const { analyzeLiveMatch } = await import('@/lib/stats/liveAnalyzer')
  
  const heroNames: Record<number, string> = {}
  for (const h of [...radiantHeroes, ...direHeroes]) {
    heroNames[h.heroId] = h.heroName
  }

  return analyzeLiveMatch({
    matchId, radiantTeam: radiantName, direTeam: direName,
    radiantTeamId: radiantId, direTeamId: direId,
    radiantScore, direScore, radiantLead, gameTime, status,
    radiantHeroIds, direHeroIds, heroNames,
  })
}

export const dynamic = 'force-dynamic'
