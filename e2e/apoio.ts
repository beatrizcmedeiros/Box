import { type Browser, devices, expect, type Page } from '@playwright/test'
import pg from 'pg'
import { bancoE2e, E2E } from '../playwright.config.ts'

export { E2E }

export async function entrar(page: Page, email: string, senha: string) {
  await page.goto('/login')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(senha)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL((url) => !url.pathname.startsWith('/login'))
}

export async function entrarComoTreinador(page: Page) {
  await entrar(page, E2E.treinador.email, E2E.treinador.senha)
  await expect(page).toHaveURL(/\/treinador\//)
}

/** Abre um "celular" separado (outra sessão), como o aparelho do aluno. */
export async function abrirCelular(browser: Browser) {
  const contexto = await browser.newContext({
    ...devices['Pixel 7'],
    baseURL: 'http://localhost:4174',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'block',
  })
  return { contexto, page: await contexto.newPage() }
}

/** Data de hoje no fuso do box, no formato AAAA-MM-DD. */
export const hoje = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())

/**
 * O código de confirmação vai por e-mail (nos testes não há envio). Marca o e-mail como
 * confirmado direto no banco de testes; o fluxo da tela de código é testado no front e na API.
 */
export async function confirmarEmailNoBanco(email: string) {
  const cliente = new pg.Client({ connectionString: bancoE2e.replace(/\?.*$/, '') })
  await cliente.connect()
  try {
    await cliente.query('UPDATE usuarios SET email_verificado_em = now() WHERE email = $1', [email])
  } finally {
    await cliente.end()
  }
}
