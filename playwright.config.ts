import { defineConfig, devices } from '@playwright/test'

// Testes de ponta a ponta: API real + build do front (com service worker) + banco prbox_e2e.
// Credenciais fictícias, usadas só neste banco de testes.
export const E2E = {
  treinador: { email: 'treinador@e2e.local', senha: 'treinador-e2e-2026' },
  aluna: { email: 'aluna@e2e.local', senha: 'aluna-e2e-2026' },
}

const PORTA_API = 3334
const PORTA_WEB = 4174
const bancoBase =
  process.env.DATABASE_URL ?? 'postgresql://prbox:prbox@localhost:5433/prbox?schema=public'
const bancoE2e = (() => {
  const url = new URL(bancoBase)
  url.pathname = '/prbox_e2e'
  return url.toString()
})()

const ambienteApi = {
  DATABASE_URL: bancoE2e,
  PORT: String(PORTA_API),
  WEB_ORIGIN: `http://localhost:${PORTA_WEB}`,
  JWT_SECRET: process.env.JWT_SECRET ?? 'segredo-somente-para-testes-e2e-0123456789-abcdef',
  LIMITE_LOGIN: '1000',
  SEED_TREINADOR_EMAIL: E2E.treinador.email,
  SEED_TREINADOR_SENHA: E2E.treinador.senha,
  SEED_ALUNO_EMAIL: E2E.aluna.email,
  SEED_ALUNO_SENHA: E2E.aluna.senha,
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1, // os cenários compartilham o mesmo banco
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${PORTA_WEB}`,
    // Localmente usa o Chrome instalado; no CI, o Chromium baixado pelo Playwright
    channel: process.env.CI ? undefined : 'chrome',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    // Fluxos principais: treinador no computador; o aluno abre um contexto de celular dentro do teste
    {
      name: 'fluxos',
      use: { ...devices['Desktop Chrome'], serviceWorkers: 'block' },
      testIgnore: /pwa/,
    },
    { name: 'pwa', use: { ...devices['Pixel 7'], serviceWorkers: 'allow' }, testMatch: /pwa/ },
  ],
  webServer: [
    {
      name: 'api',
      command: 'npx tsx scripts/preparar-e2e.ts && node --import tsx src/server.ts',
      cwd: './api',
      url: `http://localhost:${PORTA_API}/api/health`,
      env: ambienteApi,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      name: 'web',
      command: `npm run build && npx vite preview --port ${PORTA_WEB} --strictPort`,
      cwd: './web',
      url: `http://localhost:${PORTA_WEB}`,
      env: { API_PROXY: `http://localhost:${PORTA_API}` },
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
})
