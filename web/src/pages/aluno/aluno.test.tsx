import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ResumoPr } from '../../lib/tipos.ts'
import { renderizar, simularApi, usuario } from '../../test/apoio.tsx'

const backSquat: ResumoPr = {
  exercicio: { id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO' },
  pr: { id: 10, dataTeste: '2026-03-15', cargaKg: 105, origem: 'ALUNO' },
  percentuais: [
    { percentual: 35, cargaKg: 37 },
    { percentual: 40, cargaKg: 42 },
    { percentual: 45, cargaKg: 47.5 },
    { percentual: 50, cargaKg: 52.5 },
    { percentual: 55, cargaKg: 58 },
  ],
  novoRecorde: true,
  diferencaKg: 5,
}

const snatch: ResumoPr = {
  exercicio: { id: 2, nome: 'Snatch', categoria: 'OLIMPICO' },
  pr: { id: 11, dataTeste: '2026-03-17', cargaKg: 55, origem: 'IMPORTACAO' },
  percentuais: [
    { percentual: 35, cargaKg: 19.5 },
    { percentual: 40, cargaKg: 22 },
    { percentual: 45, cargaKg: 25 },
    { percentual: 50, cargaKg: 27.5 },
    { percentual: 55, cargaKg: 30.5 },
  ],
  novoRecorde: false,
  diferencaKg: null,
}

const sessaoAluno = { 'GET /api/auth/me': { body: { usuario: usuario() } } }

describe('dashboard de percentuais', () => {
  it('mostra as cargas de 35% a 55% de cada exercício', async () => {
    simularApi({ ...sessaoAluno, 'GET /api/me/prs': { body: [backSquat, snatch] } })
    renderizar('/aluno')

    const cartao = await screen.findByRole('link', { name: 'Back Squat, PR 105 kg' })
    expect(
      within(cartao)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['35%37kg', '40%42kg', '45%47,5kg', '50%52,5kg', '55%58kg'])
  })

  it('filtra por categoria', async () => {
    simularApi({ ...sessaoAluno, 'GET /api/me/prs': { body: [backSquat, snatch] } })
    renderizar('/aluno/percentuais')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByRole('button', { name: 'Olímpicos' }))

    expect(screen.queryByRole('link', { name: /Back Squat/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Snatch/ })).toBeInTheDocument()
  })

  it('sem PRs, convida a registrar o primeiro', async () => {
    simularApi({ ...sessaoAluno, 'GET /api/me/prs': { body: [] } })
    renderizar('/aluno/percentuais')

    expect(await screen.findByText('Nenhum PR registrado ainda')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Registrar meu primeiro PR' })).toHaveAttribute(
      'href',
      '/aluno/prs/novo',
    )
  })
})

describe('registrar PR', () => {
  it('aceita vírgula na carga, avisa novo recorde e abre o detalhe do exercício', async () => {
    const chamadas = simularApi({
      ...sessaoAluno,
      'GET /api/me/prs': { body: [backSquat] },
      'GET /api/me/exercicios': {
        body: [
          { id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO' },
          { id: 2, nome: 'Snatch', categoria: 'OLIMPICO' },
        ],
      },
      'POST /api/me/prs': {
        status: 201,
        body: { id: 12, dataTeste: '2026-09-10', cargaKg: 107.5, origem: 'ALUNO' },
      },
      'GET /api/me/prs/1': { body: { ...backSquat, historico: [backSquat.pr] } },
    })
    const router = renderizar('/aluno/prs/novo?exercicio=1')
    const pessoa = userEvent.setup()

    const data = await screen.findByLabelText('Data do teste de carga')
    await pessoa.clear(data)
    await pessoa.type(data, '2026-09-10')
    await pessoa.type(screen.getByLabelText('Carga máxima (PR) em kg'), '107,5')

    expect(
      await screen.findByText(/Novo recorde! \+2,5 kg em relação ao PR atual \(105 kg\)/),
    ).toBeInTheDocument()

    await pessoa.click(screen.getByRole('button', { name: 'Salvar PR' }))

    expect(await screen.findByText('PR registrado!')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/aluno/exercicios/1')
    await waitFor(() =>
      expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
        exercicioId: 1,
        dataTeste: '2026-09-10',
        cargaKg: 107.5,
      }),
    )
  })

  it('mostra o erro de validação da API no campo', async () => {
    simularApi({
      ...sessaoAluno,
      'GET /api/me/prs': { body: [] },
      'GET /api/me/exercicios': {
        body: [{ id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO' }],
      },
      'POST /api/me/prs': {
        status: 400,
        body: {
          erro: 'Dados inválidos',
          campos: [{ campo: 'cargaKg', mensagem: 'A carga deve ser de no máximo 500 kg' }],
        },
      },
    })
    renderizar('/aluno/prs/novo?exercicio=1')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('Carga máxima (PR) em kg'), '900')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar PR' }))

    expect(await screen.findByText('A carga deve ser de no máximo 500 kg')).toBeInTheDocument()
  })
})

describe('detalhe do exercício', () => {
  it('mostra o PR, a evolução e permite excluir apenas lançamentos do próprio aluno', async () => {
    simularApi({
      ...sessaoAluno,
      'GET /api/me/prs/1': {
        body: {
          ...backSquat,
          historico: [
            backSquat.pr,
            { id: 9, dataTeste: '2025-09-12', cargaKg: 100, origem: 'IMPORTACAO' },
          ],
        },
      },
    })
    renderizar('/aluno/exercicios/1')

    expect(await screen.findByRole('heading', { name: 'Back Squat' })).toBeInTheDocument()
    expect(screen.getByText('Novo recorde! +5 kg em relação ao teste anterior')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Excluir lançamento de 15/03/2026' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Excluir lançamento de 12/09/2025' }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('(treinador)')).toBeInTheDocument()
  })
})
