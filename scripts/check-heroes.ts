import { prisma } from '@/lib/prisma'

async function main() {
  const h = await prisma.hero.findFirst({ where: { id: 123 } })
  console.log('Hero 123:', h?.localizedName, '| img:', h?.imageUrl)
  
  // Check all heroes with empty image
  const empty = await prisma.hero.count({ where: { imageUrl: null } })
  console.log('Heroes with no image:', empty)
  
  await prisma.$disconnect()
}
main()
