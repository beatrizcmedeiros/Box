import { expect, test } from '@playwright/test'
import { E2E, entrar } from './apoio.ts'

test('PWA: manifest, service worker, dados guardados para offline e limpeza no logout', async ({
  page,
}) => {
  const manifesto = await (await page.request.get('/manifest.webmanifest')).json()
  expect(manifesto).toMatchObject({ short_name: 'PR Box', display: 'standalone', start_url: '/' })
  expect(manifesto.icons.map((i: { sizes: string }) => i.sizes)).toEqual([
    '192x192',
    '512x512',
    '512x512',
  ])

  await entrar(page, E2E.aluna.email, E2E.aluna.senha)
  await expect(page.getByRole('heading', { name: 'Percentuais de carga' })).toBeVisible()

  // Service worker ativo e controlando a página
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)

  // Dashboard guardado no cache para uso sem sinal
  await page.getByRole('link', { name: /^Back Squat PR/ }).waitFor()
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const cache = await caches.open('prbox-dados-aluno')
        return (await cache.keys()).map((r) => new URL(r.url).pathname).sort()
      }),
    )
    .toEqual(['/api/auth/me', '/api/me/prs'])

  // Logout apaga os dados guardados no aparelho
  await page.getByRole('link', { name: 'Perfil' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/login/)
  expect(await page.evaluate(() => caches.keys())).not.toContain('prbox-dados-aluno')
})
