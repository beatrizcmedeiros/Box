import { expect, test } from '@playwright/test'
import { abrirCelular, confirmarEmailNoBanco, E2E, entrar } from './apoio.ts'

test('a academia gera o código; o aluno cria a conta, se vincula, registra o PR e a academia vê', async ({
  page,
  browser,
}) => {
  // Academia (computador): gera o código para os alunos
  await entrar(page, E2E.academia.email, E2E.academia.senha)
  await expect(page).toHaveURL(/\/treinador\//)
  await page.getByRole('link', { name: 'Códigos de vínculo' }).click()
  const cartao = page.locator('section', { hasText: 'Código para alunos' })
  await cartao.getByRole('button', { name: 'Gerar código' }).click()
  const rotulo = await cartao.locator('[aria-label^="Código "]').getAttribute('aria-label')
  const codigo = rotulo!.replace(/\D/g, '')
  expect(codigo).toHaveLength(6)

  // Aluno (celular): cria a conta pelo app web
  const { contexto, page: celular } = await abrirCelular(browser)
  await celular.goto('/login')
  await celular.getByRole('link', { name: 'Criar conta' }).click()
  await celular.getByLabel('Seu nome').fill('Bruno Lima')
  await celular.getByLabel('E-mail').fill('bruno@e2e.local')
  await celular.getByLabel('Senha', { exact: true }).fill('bruno-senha-forte')
  await celular.getByLabel('Confirme a senha').fill('bruno-senha-forte')
  await celular.getByRole('button', { name: 'Criar conta' }).click()

  // Confirmação do e-mail (o código chegaria por e-mail) e termo
  await expect(celular).toHaveURL(/primeiro-acesso\/email/)
  await confirmarEmailNoBanco('bruno@e2e.local')
  await celular.reload()
  await celular.getByRole('button', { name: 'Li e aceito' }).click()
  await expect(celular.getByRole('heading', { name: 'Percentuais de carga' })).toBeVisible()
  await expect(celular.getByText('Nenhum PR registrado ainda')).toBeVisible()

  // Vincula-se ao box com o código
  await celular.getByRole('link', { name: 'Vínculos' }).click()
  await celular.getByLabel('Código de vínculo').fill(codigo)
  await celular.getByRole('button', { name: 'Vincular' }).click()
  await expect(celular.getByText('Pronto! Você está vinculado a Box Demonstração.')).toBeVisible()

  // Registra o PR
  await celular.getByRole('link', { name: 'Percentuais', exact: true }).click()
  await celular.getByRole('link', { name: '+ Registrar meu primeiro PR' }).click()
  await celular.getByLabel('Exercício').selectOption({ label: 'Back Squat' })
  await celular.getByLabel('Carga máxima (PR) em kg').fill('105')
  await celular.getByRole('button', { name: 'Salvar PR' }).click()

  // Detalhe com as cargas de 35% a 55% (valores da Figura 2 do relatório)
  await expect(celular.getByText('PR registrado!')).toBeVisible()
  for (const [percentual, carga] of [
    ['35%', '37 kg'],
    ['40%', '42 kg'],
    ['45%', '47,5 kg'],
    ['50%', '52,5 kg'],
    ['55%', '58 kg'],
  ]) {
    await expect(celular.getByRole('listitem').filter({ hasText: percentual })).toContainText(carga)
  }

  // A academia vê o aluno vinculado e o PR na consulta
  await page.getByRole('link', { name: 'Alunos' }).click()
  await expect(page.getByRole('row', { name: /Bruno Lima/ })).toContainText('Ativo')
  await page.getByRole('link', { name: 'Consultar cargas' }).click()
  await page.getByLabel('Aluno').fill('bruno')
  await expect(page.getByRole('row', { name: /Bruno Lima/ })).toContainText('105 kg')
  await expect(page.getByRole('row', { name: /Bruno Lima/ })).toContainText('informado pelo aluno')

  await contexto.close()
})

test('aluno não acessa o painel do treinador', async ({ browser }) => {
  const { contexto, page } = await abrirCelular(browser)
  await entrar(page, E2E.aluna.email, E2E.aluna.senha)
  await page.goto('/treinador/alunos')
  await expect(page).toHaveURL(/\/aluno\/percentuais/)
  await contexto.close()
})
