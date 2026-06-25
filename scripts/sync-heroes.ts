import { prisma } from '@/lib/prisma'

async function main() {
  console.log('Fetching heroes from OpenDota...')
  const res = await fetch('https://api.opendota.com/api/heroes')
  const heroes: any[] = await res.json()
  
  let count = 0
  let skipped = 0
  
  for (const h of heroes) {
    try {
      await prisma.hero.update({
        where: { id: h.id },
        data: {
          localizedName: h.localized_name || `Hero ${h.id}`,
          name: h.name || 'unknown',
          primaryAttr: h.primary_attr || 'str',
          attackType: h.attack_type || 'Melee',
          roles: JSON.stringify(h.roles || []),
          imageUrl: h.img ? `https://cdn.cloudflare.steamstatic.com${h.img}` : null,
        },
      })
      count++
    } catch (e: any) {
      skipped++
    }
  }
  
  console.log(`✅ Synced ${count} heroes, skipped ${skipped}`)
  
  // Verify a few
  const sample = await prisma.hero.findMany({ take: 5, orderBy: { id: 'asc' } })
  console.log('\nSample heroes:')
  for (const h of sample) {
    console.log(`  ${h.id}: ${h.localizedName} (${h.primaryAttr}, ${h.attackType}) [${h.roles}]`)
  }
  
  await prisma.$disconnect()
}

main()
