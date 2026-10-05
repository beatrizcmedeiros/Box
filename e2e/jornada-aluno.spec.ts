import { expect, test } from '@playwright/test'
import { abrirCelular, entrar, entrarComoTreinador } from './apoio.ts'

test('treinador cadastra o aluno; aluno faz o primeiro acesso, registra o PR e vê os percentuais', async ({
  page,
  browser,
}) => {
  // Treinador (computador): cadastra o aluno e anota a senha temporária
  await entrarComoTreinador(page)
  await page.getByRole('link', { name: 'Alunos' }).click()
  await page.getByRole('button', { name: '+ Novo aluno' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Novo aluno' })
  await dialogo.getByLabel('Nome completo').fill('Bruno Lima')
  await dialogo.getByLabel('E-mail').fill('bruno@e2e.local')
  await dialogo.getByLabel('Turma').selectOption({ label: 'Turma 18h' })
  await dialogo.getByRole('button', { name: 'Cadastrar aluno' }).click()
  const senhaTemporaria = (await page.getByTestId('senha-temporaria').textContent())!.trim()
  expect(senhaTemporaria).toHaveLength(10)
  await page.getByRole('button', { name: 'Concluir' }).click()
  await expect(page.getByRole('row', { name: /Bruno Lima/ })).toContainText('Aguardando 1º acesso')

  // Aluno (celular): primeiro acesso
  const { contexto, page: celular } = await abrirCelular(browser)
  await entrar(celular, 'bruno@e2e.local', senhaTemporaria)
  await expect(celular).toHaveURL(/primeiro-acesso\/senha/)
  await celular.getByLabel('Senha temporária').fill(senhaTemporaria)
  await celular.getByLabel('Nova senha', { exact: true }).fill('bruno-senha-forte')
  await celular.getByLabel('Confirme a nova senha').fill('bruno-senha-forte')
  await celular.getByRole('button', { name: 'Salvar nova senha' }).click()
  await celular.getByRole('button', { name: 'Li e aceito' }).click()

  // Cai direto no dashboard: ainda sem PRs
  await expect(celular.getByRole('heading', { name: 'Percentuais de carga' })).toBeVisible()
  await expect(celular.getByText('Nenhum PR registrado ainda')).toBeVisible()

  // 1º toque: registrar; preenche e salva
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

  // Dashboard já mostra o exercício
  await celular.getByRole('link', { name: 'Percentuais', exact: true }).click()
  await expect(celular.getByRole('link', { name: /^Back Squat PR 105 kg/ })).toBeVisible()

  // Treinador vê o aluno ativo e o PR na consulta
  await page.reload()
  await expect(page.getByRole('row', { name: /Bruno Lima/ })).toContainText('Ativo')
  await page.getByRole('link', { name: 'Consultar cargas' }).click()
  await page.getByLabel('Aluno').fill('bruno')
  await expect(page.getByRole('row', { name: /Bruno Lima/ })).toContainText('105 kg')
  await expect(page.getByRole('row', { name: /Bruno Lima/ })).toContainText('informado pelo aluno')

  await contexto.close()
})

test('aluno não acessa o painel do treinador', async ({ browser }) => {
  const { contexto, page } = await abrirCelular(browser)
  await entrar(page, 'aluna@e2e.local', 'aluna-e2e-2026')
  await page.goto('/treinador/alunos')
  await expect(page).toHaveURL(/\/aluno\/percentuais/)
  await contexto.close()
})
