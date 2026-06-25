import { prisma } from '@/lib/prisma'
import { HEROES, TI2026_EUROPE_TEAMS, TI2026_NA_TEAMS } from '@/lib/seed-data'

let seeded = false

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS Hero (id INTEGER PRIMARY KEY, name TEXT NOT NULL, localizedName TEXT NOT NULL, primaryAttr TEXT NOT NULL, attackType TEXT NOT NULL, roles TEXT DEFAULT '[]', imageUrl TEXT);
CREATE TABLE IF NOT EXISTS Team (id INTEGER PRIMARY KEY, name TEXT NOT NULL, tag TEXT, region TEXT, logoUrl TEXT);
CREATE TABLE IF NOT EXISTS Tournament (id INTEGER PRIMARY KEY, name TEXT NOT NULL, shortName TEXT NOT NULL, region TEXT NOT NULL, startDate TEXT NOT NULL, endDate TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS Match (id INTEGER PRIMARY KEY, tournamentId INTEGER NOT NULL REFERENCES Tournament(id), radiantTeamId INTEGER REFERENCES Team(id), direTeamId INTEGER REFERENCES Team(id), winner TEXT, radiantScore INTEGER, direScore INTEGER, duration INTEGER, startTime TEXT, endTime TEXT, status TEXT DEFAULT 'upcoming', stage TEXT, matchOrder INTEGER, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS MatchPick (id INTEGER PRIMARY KEY AUTOINCREMENT, matchId INTEGER NOT NULL REFERENCES Match(id), heroId INTEGER NOT NULL REFERENCES Hero(id), side TEXT NOT NULL, isRadiant INTEGER NOT NULL, playerName TEXT);
CREATE TABLE IF NOT EXISTS TeamMatch (id INTEGER PRIMARY KEY AUTOINCREMENT, matchId INTEGER NOT NULL REFERENCES Match(id), teamId INTEGER NOT NULL REFERENCES Team(id), side TEXT NOT NULL, isWin INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS HeroStat (id INTEGER PRIMARY KEY AUTOINCREMENT, heroId INTEGER NOT NULL REFERENCES Hero(id), position TEXT DEFAULT '', matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, winRate REAL DEFAULT 0, picks INTEGER DEFAULT 0, bans INTEGER DEFAULT 0, tournamentId INTEGER DEFAULT 0, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS TeamStat (id INTEGER PRIMARY KEY AUTOINCREMENT, teamId INTEGER NOT NULL REFERENCES Team(id), matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0, winRate REAL DEFAULT 0, tournamentId INTEGER DEFAULT 0, recentForm TEXT, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS ComboStat (id INTEGER PRIMARY KEY AUTOINCREMENT, hero1Id INTEGER NOT NULL, hero2Id INTEGER NOT NULL, matches INTEGER DEFAULT 0, wins INTEGER DEFAULT 0, winRate REAL DEFAULT 0, tournamentId INTEGER DEFAULT 0, updatedAt TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX IF NOT EXISTS idx_Team_region ON Team(region);
CREATE INDEX IF NOT EXISTS idx_Tournament_region ON Tournament(region);
CREATE INDEX IF NOT EXISTS idx_Match_tournamentId ON Match(tournamentId);
CREATE INDEX IF NOT EXISTS idx_Match_status ON Match(status);
CREATE INDEX IF NOT EXISTS idx_MatchPick_matchId ON MatchPick(matchId);
CREATE INDEX IF NOT EXISTS idx_MatchPick_heroId ON MatchPick(heroId);
CREATE INDEX IF NOT EXISTS idx_TeamMatch_matchId ON TeamMatch(matchId);
CREATE INDEX IF NOT EXISTS idx_TeamMatch_teamId ON TeamMatch(teamId);
CREATE INDEX IF NOT EXISTS idx_HeroStat_heroId ON HeroStat(heroId);
CREATE INDEX IF NOT EXISTS idx_HeroStat_winRate ON HeroStat(winRate);
CREATE INDEX IF NOT EXISTS idx_TeamStat_teamId ON TeamStat(teamId);
CREATE INDEX IF NOT EXISTS idx_ComboStat_winRate ON ComboStat(winRate);
`

export async function ensureDb() {
  if (seeded) return
  try {
    // Create schema first
    const statements = SCHEMA_SQL.split(';').map(s => s.trim()).filter(s => s)
    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt + ';')
    }
    console.log('📐 Schema created')

    const count = await prisma.hero.count()
    if (count > 0) { seeded = true; return }
  } catch (e) {
    console.error('Schema/check error:', e)
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
