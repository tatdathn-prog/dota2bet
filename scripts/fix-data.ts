import { prisma } from '@/lib/prisma'

async function main() {
  // Use Stratz CDN (same as seed.ts) - more reliable than OpenDota's img field
  const heroes = await prisma.hero.findMany()
  let count = 0
  for (const h of heroes) {
    const imgUrl = `https://cdn.stratz.com/images/dota2/heroes/${h.name}_vert.png`
    await prisma.hero.update({
      where: { id: h.id },
      data: { imageUrl: imgUrl },
    })
    count++
  }
  console.log(`✅ Updated ${count} hero images to Stratz CDN`)
  
  // Also fix Power Rangers name (remove underscore prefix)
  const pr = await prisma.team.findFirst({ where: { id: 55 } })
  if (pr) {
    const fixedName = pr.name.replace(/^_/, '')
    await prisma.team.update({ where: { id: 55 }, data: { name: fixedName, tag: 'PR' } })
    console.log(`✅ Fixed team name: "${pr.name}" → "${fixedName}"`)
  }

  // Verify
  const sample = await prisma.hero.findFirst({ where: { id: 123 } })
  console.log(`Sample: ${sample?.localizedName} → ${sample?.imageUrl}`)
  
  await prisma.$disconnect()
}
main()
