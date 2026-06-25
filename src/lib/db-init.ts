import { prisma } from '@/lib/prisma'
import { HEROES, TI2026_EUROPE_TEAMS, TI2026_NA_TEAMS } from '@/lib/seed-data'

let seeded = false

export async function ensureDb() {
  if (seeded) return
  try {
    const count = await prisma.hero.count()
    if (count > 0) { seeded = true; return }
  } catch {
    // Table doesn't exist yet - push schema first
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
