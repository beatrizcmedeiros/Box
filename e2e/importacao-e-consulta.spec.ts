import { expect, test } from '@playwright/test'
import { abrirCelular, E2E, entrar, entrarComoTreinador } from './apoio.ts'

test('treinador importa a lista, a aluna vê o resultado e a importação pode ser desfeita', async ({
  page,
  browser,
}) => {
  await entrarComoTreinador(page)
  await page.getByRole('link', { name: 'Importar cargas (PDF)' }).click()

  // Lista no formato da nota do treinador (colada como texto)
  await page.getByRole('tab', { name: 'Colar texto' }).click()
  await page.getByLabel('Texto da lista').fill('Teste agachamento\nAna 62,5kg\nZé Ninguém 80')
  await page.getByRole('button', { name: 'Ler resultados' }).click()

  const revisao = page.getByRole('region', { name: 'Revisão da importação' })
  await expect(revisao).toBeVisible()
  // "agachamento" é ambíguo: escolhe o exercício
  await revisao
    .getByRole('combobox', { name: 'Exercício' })
    .selectOption({ label: 'Back Squat — sugerido' })
  await expect(revisao.getByRole('row', { name: /Ana/ })).toContainText('Aluno encontrado')
  await expect(revisao.getByRole('row', { name: /Zé Ninguém/ })).toContainText('Não encontrado')
  await revisao.getByRole('button', { name: 'Confirmar importação (1)' }).click()
  await expect(page.getByText(/1 resultado\(s\) importado\(s\)/)).toBeVisible()

  // A aluna vê o resultado importado como PR atual
  const { contexto, page: celular } = await abrirCelular(browser)
  await entrar(celular, E2E.aluna.email, E2E.aluna.senha)
  await expect(celular.getByRole('link', { name: /^Back Squat PR 62,5 kg/ })).toBeVisible()
  await celular.getByRole('link', { name: /^Back Squat PR 62,5 kg/ }).click()
  await expect(celular.getByText('(treinador)')).toBeVisible()

  // Desfazer devolve o PR anterior (105 kg do histórico de demonstração)
  page.once('dialog', (d) => d.accept())
  await page.getByRole('button', { name: 'Desfazer' }).click()
  await expect(page.getByRole('row', { name: /Desfeita/ })).toBeVisible()
  await celular.goto('/aluno/percentuais')
  await expect(celular.getByRole('link', { name: /^Back Squat PR 105 kg/ })).toBeVisible()
  await contexto.close()
})

test('consulta combina filtros e mantém o estado na URL', async ({ page }) => {
  await entrarComoTreinador(page)
  await page.getByRole('link', { name: 'Consultar cargas' }).click()

  await page.getByLabel('Exercício').selectOption({ label: 'Deadlift' })
  await page.getByLabel('Turma').selectOption({ label: 'Turma 18h' })
  await expect(page.getByRole('row', { name: /Ana Souza/ })).toContainText('120 kg')
  await expect(page).toHaveURL(/exercicioId=\d+.*turmaId=\d+|turmaId=\d+.*exercicioId=\d+/)

  // Recarregar mantém os filtros
  await page.reload()
  await expect(
    page.getByRole('button', { name: 'Remover filtro Exercício: Deadlift' }),
  ).toBeVisible()
  await expect(page.getByText('Média da turma')).toBeVisible()

  await page.getByRole('button', { name: 'Limpar filtros' }).click()
  await expect(page.getByRole('button', { name: /Remover filtro/ })).toHaveCount(0)
})
