import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ConsultaPercentuais } from '../../lib/tipos.ts'
import { renderizar, simularApi, usuario } from '../../test/apoio.tsx'

const linha = (
  alunoId: number,
  nome: string,
  exercicio: { id: number; nome: string },
  prKg: number,
  cargas: [number, number][],
) => ({
  aluno: { id: alunoId, nome },
  turma: { id: 3, nome: 'Turma 18h' },
  exercicio,
  dataTeste: '2026-03-15',
  prKg,
  cargas: cargas.map(([percentual, cargaKg]) => ({ percentual, cargaKg })),
})

const backSquat = { id: 1, nome: 'Back Squat' }
const clean = { id: 2, nome: 'Clean' }

function simular(resposta: ConsultaPercentuais) {
  return simularApi({
    'GET /api/auth/me': {
      body: { usuario: usuario({ id: 9, nome: 'Carlos', perfil: 'TREINADOR' }) },
    },
    'GET /api/admin/turmas': {
      body: [{ id: 3, nome: 'Turma 18h', horario: '18:00', totalAlunos: 2 }],
    },
    'GET /api/admin/exercicios': {
      body: [
        { id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO', ativo: true, aliases: [] },
        { id: 2, nome: 'Clean', categoria: 'OLIMPICO', ativo: true, aliases: [] },
      ],
    },
    'GET /api/admin/percentuais': { body: resposta },
  })
}

const ultimaConsulta = (chamadas: { url: string }[]) =>
  new URLSearchParams(
    chamadas
      .filter((c) => c.url.startsWith('/api/admin/percentuais'))
      .at(-1)
      ?.url.split('?')[1],
  )

describe('percentuais do treinador', () => {
  it('pede um filtro antes de consultar', async () => {
    const chamadas = simular({
      percentuais: [],
      resultados: [],
      totais: { alunos: 0, registros: 0 },
      limitado: false,
    })
    renderizar('/treinador/percentuais')

    expect(await screen.findByText(/Escolha uma turma, um exercício/)).toBeInTheDocument()
    expect(chamadas.some((c) => c.url.startsWith('/api/admin/percentuais'))).toBe(false)
  })

  it('mostra a turma inteira no exercício e filtra só os percentuais escolhidos', async () => {
    const chamadas = simular({
      percentuais: [35, 45],
      resultados: [
        linha(1, 'Ana Souza', backSquat, 105, [
          [35, 37],
          [45, 47.5],
        ]),
        linha(2, 'Bruno Lima', backSquat, 130, [
          [35, 45.5],
          [45, 58.5],
        ]),
      ],
      totais: { alunos: 2, registros: 2 },
      limitado: false,
    })
    renderizar('/treinador/percentuais?turmaId=3&exercicioId=1')
    const pessoa = userEvent.setup()

    // Começa com todos os percentuais
    await waitFor(() => expect(ultimaConsulta(chamadas).get('percentuais')).toBe('35,40,45,50,55'))
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'true')

    // Escolher 35% mostra só ele; somar 45% mostra os dois
    await pessoa.click(screen.getByRole('button', { name: '35%' }))
    await pessoa.click(screen.getByRole('button', { name: '45%' }))
    await waitFor(() => expect(ultimaConsulta(chamadas).get('percentuais')).toBe('35,45'))
    expect(screen.getByRole('button', { name: 'Todos' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '40%' })).toHaveAttribute('aria-pressed', 'false')
    expect(ultimaConsulta(chamadas).get('turmaId')).toBe('3')
    expect(ultimaConsulta(chamadas).get('exercicioId')).toBe('1')

    // Uma linha por aluno, com as cargas na mesma tela; exercício e turma já estão no filtro
    const ana = await screen.findByRole('row', { name: /Ana Souza/ })
    expect(
      within(ana)
        .getAllByRole('cell')
        .map((c) => c.textContent),
    ).toEqual(['105 kg15/03/2026', '37kg', '47,5kg'])
    expect(screen.queryByRole('columnheader', { name: 'Exercício' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('columnheader').map((c) => c.textContent)).toEqual([
      'Aluno',
      'PR',
      '35%',
      '45%',
    ])

    // Não deixa ficar sem nenhum percentual
    await pessoa.click(screen.getByRole('button', { name: '35%' }))
    await pessoa.click(screen.getByRole('button', { name: '45%' }))
    expect(screen.getByRole('button', { name: '45%' })).toHaveAttribute('aria-pressed', 'true')

    // "Todos" volta a mostrar tudo
    await pessoa.click(screen.getByRole('button', { name: 'Todos' }))
    await waitFor(() => expect(ultimaConsulta(chamadas).get('percentuais')).toBe('35,40,45,50,55'))
  })

  it('agrupa os exercícios de um aluno pesquisado pelo nome', async () => {
    const chamadas = simular({
      percentuais: [35, 40, 45, 50, 55],
      resultados: [
        linha(1, 'Ana Souza', backSquat, 105, [
          [35, 37],
          [40, 42],
          [45, 47.5],
          [50, 52.5],
          [55, 58],
        ]),
        linha(1, 'Ana Souza', clean, 70, [
          [35, 24.5],
          [40, 28],
          [45, 31.5],
          [50, 35],
          [55, 38.5],
        ]),
      ],
      totais: { alunos: 1, registros: 2 },
      limitado: false,
    })
    renderizar('/treinador/percentuais')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('Aluno'), 'ana')
    await waitFor(() => expect(ultimaConsulta(chamadas).get('busca')).toBe('ana'))

    const linhas = await screen.findAllByRole('row', { name: /Ana Souza/ })
    expect(linhas).toHaveLength(2)
    expect(within(linhas[0]).getByRole('cell', { name: 'Back Squat' })).toBeInTheDocument()
    expect(within(linhas[1]).getByRole('cell', { name: 'Clean' })).toBeInTheDocument()
    expect(within(linhas[1]).getByRole('cell', { name: '24,5kg' })).toBeInTheDocument()
    // Nome visível uma vez só; a turma aparece porque não foi filtrada
    expect(
      screen.getAllByText('Ana Souza').filter((e) => !e.classList.contains('sr-only')),
    ).toHaveLength(1)
    expect(screen.getByText('Turma 18h', { selector: 'span' })).toBeInTheDocument()
  })
})
