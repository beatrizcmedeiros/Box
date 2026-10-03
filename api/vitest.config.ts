import { defineConfig } from 'vitest/config'
import { urlBancoTeste } from './test/url-banco-teste.ts'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: urlBancoTeste(),
      JWT_SECRET: 'segredo-somente-para-testes-automatizados-0123456789',
    },
    // Os testes de integração compartilham o mesmo banco
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 20_000,
  },
})
