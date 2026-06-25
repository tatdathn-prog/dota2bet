import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

const dbPath = process.env.VERCEL ? '/tmp/dota2bet.db' : 'file:./prisma/dev.db'
const adapter = new PrismaLibSql({
  url: dbPath,
})

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
