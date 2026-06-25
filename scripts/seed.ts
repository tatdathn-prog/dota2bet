import { prisma } from '@/lib/prisma'
import { HEROES, TI2026_EUROPE_TEAMS, TI2026_NA_TEAMS } from '@/lib/seed-data'

async function seed() {
  console.log('🌱 Seeding database...')

  // Seed heroes
  for (const hero of HEROES) {
    await prisma.hero.upsert({
      where: { id: hero.id },
      update: {
        name: hero.name,
        localizedName: hero.localizedName,
        primaryAttr: hero.primaryAttr,
        attackType: hero.attackType,
        roles: JSON.stringify(hero.roles),
        imageUrl: `https://cdn.stratz.com/images/dota2/heroes/${hero.name}_vert.png`,
      },
      create: {
        id: hero.id,
        name: hero.name,
        localizedName: hero.localizedName,
        primaryAttr: hero.primaryAttr,
        attackType: hero.attackType,
        roles: JSON.stringify(hero.roles),
        imageUrl: `https://cdn.stratz.com/images/dota2/heroes/${hero.name}_vert.png`,
      },
    })
  }
  console.log(`  ✓ ${HEROES.length} heroes seeded`)

  // Seed teams
  for (const team of [...TI2026_EUROPE_TEAMS, ...TI2026_NA_TEAMS]) {
    await prisma.team.upsert({
      where: { id: team.id },
      update: { name: team.name, tag: team.tag, region: team.region },
      create: { id: team.id, name: team.name, tag: team.tag, region: team.region },
    })
  }
  console.log(`  ✓ ${TI2026_EUROPE_TEAMS.length + TI2026_NA_TEAMS.length} teams seeded`)

  // Seed tournaments
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
  console.log('  ✓ Tournaments seeded')

  console.log('✅ Seed complete!')
}

seed()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
