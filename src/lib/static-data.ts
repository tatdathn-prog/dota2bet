import { HEROES, TI2026_EUROPE_TEAMS, TI2026_NA_TEAMS } from '@/lib/seed-data'

export const SEED_HEROES = HEROES.map(h => ({
  id: h.id,
  name: h.localizedName,
  img: 'https://cdn.stratz.com/images/dota2/heroes/' + h.name + '_vert.png',
  roles: h.roles,
  stats: { carry: { picks: 0, wins: 0, wr: 0 }, mid: { picks: 0, wins: 0, wr: 0 }, offlane: { picks: 0, wins: 0, wr: 0 }, support: { picks: 0, wins: 0, wr: 0 } },
  overall: { picks: 0, wins: 0, wr: 0, bans: 0 },
}))

export const SEED_TEAMS = [...TI2026_EUROPE_TEAMS, ...TI2026_NA_TEAMS]

export const SEED_TOURNAMENTS = [
  { id: 1, name: 'TI 2026: EU Qualifier', shortName: 'TI2026 EU', region: 'EU' },
  { id: 2, name: 'TI 2026: NA Qualifier', shortName: 'TI2026 NA', region: 'NA' },
]
