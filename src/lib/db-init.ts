import { prisma } from '@/lib/prisma'
import { createClient } from '@libsql/client'
import { HEROES, TI2026_EUROPE_TEAMS, TI2026_NA_TEAMS } from '@/lib/seed-data'

let seeded = false

export async function ensureDb() {
  if (seeded) return
  try {
    const count = await prisma.hero.count()
    if (count > 0) { seeded = true; return }
  } catch {
    // Table doesn't exist - create schema using raw libsql client
    const dbPath = process.env.VERCEL ? '/tmp/dota2bet.db' : 'file:./prisma/dev.db'
    const libsql = createClient({ url: `file:${dbPath}` })
    
    const statements = [
      `CREATE TABLE IF NOT EXISTS Hero (id INTEGER PRIMARY KEY, name TEXT NOT NULL, localizedName TEXT NOT NULL, primaryAttr TEXT NOT NULL, attackType TEXT NOT NULL, roles TEXT DEFAULT '[]', imageUrl TEXT)`,
      `CREATE TABLE IF NOT EXISTS Team (id INTEGER PRIMARY KEY, name TEXT NOT NULL, tag TEXT, region TEXT, logoUrl TEXT)`,
      `CREATE TABLE IF NOT EXISTS Tournament (id INTEGER PRIMARY KEY, name TEXT NOT NULL, shortName TEXT NOT NULL, region TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS Match (id INTEGER PRIMARY KEY, tournamentId INTEGER NOT NULL REFERENCES Tournament(id), radiantTeamId INTEGER REFERENCES Team(id), direTeamId INTEGER REFERENCES Team(id), winner TEXT, radiantScore INTEGER, direScore INTEGER, duration INTEGER, startTime TEXT, endTime TEXT, status TEXT DEFAULT 'upcoming', stage TEXT, matchOrder INTEGER, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS MatchPick (id INTEGER PRIMARY KEY AUTOINCREMENT, matchId INTEGER NOT NULL REFERENCES Match(id), heroId INTEGER NOT NULL REFERENCES Hero(id), side TEXT NOT NULL, isRadiant INTEGER NOT NULL, playerName TEXT)`,
      `CREATE TABLE IF NOT EXISTS TeamMatch (id INTEGER PRIMARY KEY AUTOINCREMENT, matchId INTEGER NOT NULL REFERENCES Match(id), teamId INTEGER NOT NULL REFERENCES Team(id), side TEXT NOT NULL, isWin INTEGER NOT NULL)`,
      `CREATE TABLE IF NOT EXISTS HeroStat (id INTEGER PRIMARY KEY AUTOINCREMENT, heroId INTEGER NOT NULL REFERENCES Hero(id), position TEXT DEFAULT '', matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, winRate REAL DEFAULT 0, picks INTEGER DEFAULT 0, bans INTEGER DEFAULT 0, tournamentId INTEGER DEFAULT 0, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS TeamStat (id INTEGER PRIMARY KEY AUTOINCREMENT, teamId INTEGER NOT NULL REFERENCES Team(id), matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, winRate REAL DEFAULT 0, tournamentId INTEGER DEFAULT 0, recentForm TEXT, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
      `CREATE TABLE IF NOT EXISTS ComboStat (id INTEGER PRIMARY KEY AUTOINCREMENT, hero1Id INTEGER NOT NULL, hero2Id INTEGER NOT NULL, matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, winRate REAL DEFAULT 0, tournamentId INTEGER DEFAULT 0, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP)`,
    ]
    
    for (const stmt of statements) {
      await libsql.execute(stmt)
    }
    console.log('📐 Schema created via libsql client')
  }

  console.log('🌱 Auto-seeding database...')

  for (const hero of HEROES) {
    await prisma.hero.upsert({
      where: { id: hero.id },
      update: {},
      create: {
        id: hero.id, name: hero.name, localizedName: hero.localizedName,
        primaryAttr: hero.primaryAttr, attackType: hero.attackType,
        roles: JSON.stringify(hero.roles),
        imageUrl: `https://cdn.stratz.com/images/dota2/heroes/${hero.name}_vert.png`,
      },
    })
  }

  const allTeams = [...TI2026_EUROPE_TEAMS, ...TI2026_NA_TEAMS]
  for (const team of allTeams) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: {},
      create: { id: team.id, name: team.name, tag: team.tag, region: team.region },
    })
  }

  await prisma.tournament.upsert({
    where: { id: 1 }, update: {},
    create: { id: 1, name: 'TI 2026: EU Qualifier', shortName: 'TI2026 EU', region: 'EU', startDate: new Date('2026-06-21'), endDate: new Date('2026-06-28') },
  })
  await prisma.tournament.upsert({
    where: { id: 2 }, update: {},
    create: { id: 2, name: 'TI 2026: NA Qualifier', shortName: 'TI2026 NA', region: 'NA', startDate: new Date('2026-06-24'), endDate: new Date('2026-06-26') },
  })

  console.log(`✅ Auto-seeded: ${HEROES.length} heroes, ${allTeams.length} teams, 2 tournaments`)
  seeded = true
}
