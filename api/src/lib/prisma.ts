import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client.ts'
import { env } from '../env.ts'

const adapter = new PrismaPg({ connectionString: env.databaseUrl })

export const prisma = new PrismaClient({ adapter })

export async function bancoDisponivel(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
