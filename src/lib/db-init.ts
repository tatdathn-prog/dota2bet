import { prisma } from '@/lib/prisma'
import { createClient } from '@libsql/client'
import { HEROES, TI2026_EUROPE_TEAMS, TI2026_NA_TEAMS } from '@/lib/seed-data'

let seeded = false

export async function ensureDb() {
  if (seeded) return
  
  const dbPath = process.env.VERCEL ? '/tmp/dota2bet.db' : 'file:./prisma/dev.db'
  const libsql = createClient({ url: `file:${dbPath}` })

  // Always ensure schema exists (IF NOT EXISTS makes it idempotent)
  const schema = [
    `CREATE TABLE IF NOT EXISTS Hero (id INTEGER PRIMARY KEY, name TEXT NOT NULL, localizedName TEXT NOT NULL, primaryAttr TEXT NOT NULL, attackType TEXT NOT NULL, roles TEXT DEFAULT '[]', imageUrl TEXT)`,
    `CREATE TABLE IF NOT EXISTS Team (id INTEGER PRIMARY KEY, name TEXT NOT NULL, tag TEXT, region TEXT, logoUrl TEXT)`,
    `CREATE TABLE IF NOT EXISTS Tournament (id INTEGER PRIMARY KEY, name TEXT NOT NULL, shortName TEXT NOT NULL, region TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS "Match" (id INTEGER PRIMARY KEY, tournamentId INTEGER NOT NULL REFERENCES Tournament(id), radiantTeamId INTEGER REFERENCES Team(id), direTeamId INTEGER REFERENCES Team(id), winner TEXT, radiantScore INTEGER, direScore INTEGER, duration INTEGER, startTime TEXT, endTime TEXT, status TEXT DEFAULT 'upcoming', stage TEXT, matchOrder INTEGER, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS MatchPick (id INTEGER PRIMARY KEY AUTOINCREMENT, matchId INTEGER NOT NULL REFERENCES "Match"(id), heroId INTEGER NOT NULL REFERENCES Hero(id), side TEXT NOT NULL, isRadiant INTEGER NOT NULL, playerName TEXT)`,
    `CREATE TABLE IF NOT EXISTS TeamMatch (id INTEGER PRIMARY KEY AUTOINCREMENT, matchId INTEGER NOT NULL REFERENCES "Match"(id), teamId INTEGER NOT NULL REFERENCES Team(id), side TEXT NOT NULL, isWin INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS HeroStat (id INTEGER PRIMARY KEY AUTOINCREMENT, heroId INTEGER NOT NULL REFERENCES Hero(id), position TEXT DEFAULT '', matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, winRate REAL DEFAULT 0, picks INTEGER DEFAULT 0, bans INTEGER DEFAULT 0, tournamentId INTEGER DEFAULT 0, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS TeamStat (id INTEGER PRIMARY KEY AUTOINCREMENT, teamId INTEGER NOT NULL REFERENCES Team(id), matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, winRate REAL DEFAULT 0, tournamentId INTEGER DEFAULT 0, recentForm TEXT, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
    `CREATE TABLE IF NOT EXISTS ComboStat (id INTEGER PRIMARY KEY AUTOINCREMENT, hero1Id INTEGER NOT NULL, hero2Id INTEGER NOT NULL, matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, winRate REAL DEFAULT 0, tournamentId INTEGER DEFAULT 0, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
  ]
  
  console.log('📐 Ensuring schema...')
  for (const stmt of schema) {
    await libsql.execute(stmt)
  }

  // Check if already seeded
  const r = await libsql.execute('SELECT COUNT(*) as c FROM Hero')
  const count = Number(r.rows[0]?.c ?? 0)
  if (count > 0) { seeded = true; return }

  console.log(`🌱 Seeding (0 heroes found, inserting ${HEROES.length})...`)

  // Seed heroes via raw SQL for speed
  for (const hero of HEROES) {
    await libsql.execute({
      sql: `INSERT OR IGNORE INTO Hero (id, name, localizedName, primaryAttr, attackType, roles, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [hero.id, hero.name, hero.localizedName, hero.primaryAttr, hero.attackType, JSON.stringify(hero.roles), `https://cdn.stratz.com/images/dota2/heroes/${hero.name}_vert.png`],
    })
  }

  const allTeams = [...TI2026_EUROPE_TEAMS, ...TI2026_NA_TEAMS]
  for (const team of allTeams) {
    await libsql.execute({
      sql: `INSERT OR IGNORE INTO Team (id, name, tag, region) VALUES (?, ?, ?, ?)`,
      args: [team.id, team.name, team.tag, team.region],
    })
  }

  await libsql.execute({
    sql: `INSERT OR IGNORE INTO Tournament (id, name, shortName, region, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [1, 'TI 2026: EU Qualifier', 'TI2026 EU', 'EU', '2026-06-21', '2026-06-28'],
  })
  await libsql.execute({
    sql: `INSERT OR IGNORE INTO Tournament (id, name, shortName, region, startDate, endDate) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [2, 'TI 2026: NA Qualifier', 'TI2026 NA', 'NA', '2026-06-24', '2026-06-26'],
  })

  console.log(`✅ Seeded: ${HEROES.length} heroes, ${allTeams.length} teams, 2 tournaments`)
  seeded = true
}
