import { defineConfig, env } from 'prisma/config'

// O Prisma 7 não carrega o .env sozinho. No CI as variáveis vêm do ambiente.
try {
  process.loadEnvFile()
} catch {
  // sem .env: segue com as variáveis já definidas
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
