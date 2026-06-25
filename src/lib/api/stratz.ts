const STRATZ_API = 'https://api.stratz.com/graphql'

const TOKEN = process.env.STRATZ_TOKEN || ''

export async function stratzQuery(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(STRATZ_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(TOKEN && { Authorization: `Bearer ${TOKEN}` }),
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`STRATZ API error: ${res.status}`)
  return res.json()
}

export interface StratzMatch {
  id: number
  startDateTime: number | null
  endDateTime: number | null
  didRadiantWin: boolean | null
  radiantScore: number | null
  direScore: number | null
  durationSeconds: number | null
  radiantTeam?: { id: number; name: string; tag?: string } | null
  direTeam?: { id: number; name: string; tag?: string } | null
  pickBans?: Array<{
    heroId: number
    isPick: boolean
    isRadiant: boolean
    playerName?: string | null
    order: number
  }> | null
}

export async function fetchLeagueMatches(leagueId: number, take = 100): Promise<StratzMatch[]> {
  const query = `
    query LeagueMatches($leagueId: Int!, $take: Int!) {
      league(id: $leagueId) {
        id
        displayName
        matches(request: { take: $take }) {
          id
          startDateTime
          endDateTime
          didRadiantWin
          radiantScore
          direScore
          durationSeconds
          radiantTeam { id name tag }
          direTeam { id name tag }
          pickBans {
            heroId
            isPick
            isRadiant
            playerName
            order
          }
        }
      }
    }
  `
  const data = await stratzQuery(query, { leagueId, take })
  return data?.data?.league?.matches || []
}

// Liquipedia fallback: fetch via their API
export async function fetchLiquipediaMatches(tournament: string) {
  try {
    const url = `https://liquipedia.net/dota2/api.php?action=parse&page=The_International/2026/${tournament}&format=json&prop=text`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TI2026-Stats/1.0' },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
