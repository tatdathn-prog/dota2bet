const OPENDOTA_API = 'https://api.opendota.com/api'

export interface OpenDotaProMatch {
  match_id: number
  duration: number
  start_time: number
  radiant_team_id: number | null
  dire_team_id: number | null
  radiant_name: string | null
  dire_name: string | null
  leagueid: number
  league_name: string
  radiant_win: boolean
  radiant_score: number | null
  dire_score: number | null
  series_id: number
  series_type: number
}

export interface OpenDotaMatchDetail {
  match_id: number
  duration: number
  start_time: number
  radiant_team_id: number | null
  dire_team_id: number | null
  radiant_name: string | null
  dire_name: string | null
  radiant_win: boolean
  radiant_score: number
  dire_score: number
  leagueid: number
  league_name: string
  picks_bans: Array<{
    is_pick: boolean
    hero_id: number
    team: number // 0 = radiant, 1 = dire
    order: number
  }> | null
}

export async function fetchProMatches(): Promise<OpenDotaProMatch[]> {
  const res = await fetch(`${OPENDOTA_API}/proMatches`)
  if (!res.ok) throw new Error(`OpenDota API error: ${res.status}`)
  return res.json()
}

export async function fetchMatchDetail(matchId: number): Promise<OpenDotaMatchDetail> {
  const res = await fetch(`${OPENDOTA_API}/matches/${matchId}`)
  if (!res.ok) throw new Error(`OpenDota match detail error: ${res.status} for ${matchId}`)
  return res.json()
}

export function filterTIMatches(matches: OpenDotaProMatch[]): {
  eu: OpenDotaProMatch[]
  na: OpenDotaProMatch[]
} {
  const eu = matches.filter(m => {
    const name = m.league_name.toLowerCase()
    return (
      name.includes('international') &&
      (name.includes('europe') || name.includes('eu '))
    )
  })

  const na = matches.filter(m => {
    const name = m.league_name.toLowerCase()
    return (
      name.includes('international') &&
      (name.includes('north america') || name.includes('na '))
    )
  })

  return { eu, na }
}

// Search leagues for TI 2026 qualifiers
export async function searchLeague(nameQuery: string) {
  const res = await fetch(`https://api.opendota.com/api/leagues`)
  if (!res.ok) return []
  const leagues: Array<{ leagueid: number; name: string; tier: string }> = await res.json()
  return leagues.filter(l => l.name.toLowerCase().includes(nameQuery.toLowerCase()))
}
