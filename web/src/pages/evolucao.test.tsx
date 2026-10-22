import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { EvolucaoTurmas, SerieExercicio } from '../lib/tipos.ts'
import { renderizar, simularApi, usuario } from '../test/apoio.tsx'

const backSquat: SerieExercicio = {
  exercicio: { id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO' },
  pontos: [
    { data: '2025-03-14', cargaKg: 92.5 },
    { data: '2025-09-12', cargaKg: 100 },
    { data: '2026-03-15', cargaKg: 105 },
  ],
  primeiroKg: 92.5,
  atualKg: 105,
  melhorKg: 105,
  variacaoKg: 12.5,
  variacaoPct: 13.5,
}
const snatch: SerieExercicio = {
  exercicio: { id: 2, nome: 'Snatch', categoria: 'OLIMPICO' },
  pontos: [{ data: '2026-03-17', cargaKg: 55 }],
  primeiroKg: 55,
  atualKg: 55,
  melhorKg: 55,
  variacaoKg: 0,
  variacaoPct: 0,
}

describe('evolução do aluno', () => {
  it('mostra o gráfico do exercício, a evolução desde o primeiro registro e a tabela', async () => {
    simularApi({
      'GET /api/auth/me': { body: { usuario: usuario() } },
      'GET /api/me/evolucao': { body: { exercicios: [backSquat, snatch] } },
    })
    renderizar('/aluno/evolucao')
    const pessoa = userEvent.setup()

    const grafico = await screen.findByRole('img', {
      name: /Evolução no Back Squat: de 92,5 kg .* para 105 kg/,
    })
    expect(screen.getByText('+12,5 kg')).toBeInTheDocument()
    expect(screen.getByText('+13,5% desde o primeiro')).toBeInTheDocument()

    // Teclado: foco mostra a dica do último teste; seta esquerda volta um teste
    grafico.focus()
    expect(await screen.findByRole('status')).toHaveTextContent('Teste de 15/03/2026105 kg')
    await pessoa.keyboard('{ArrowLeft}')
    expect(screen.getByRole('status')).toHaveTextContent('Teste de 12/09/2025100 kg')

    // Alternativa em tabela
    await pessoa.click(screen.getByRole('button', { name: 'Ver tabela' }))
    const linhas = within(screen.getByRole('table')).getAllByRole('row')
    expect(linhas.map((l) => l.textContent)).toEqual([
      'Data do testeCargaVariação',
      '14/03/202592,5 kg1º teste',
      '12/09/2025100 kg▲ +7,5 kg',
      '15/03/2026105 kg▲ +5 kg',
    ])
  })

  it('troca o exercício pelos cartões', async () => {
    simularApi({
      'GET /api/auth/me': { body: { usuario: usuario() } },
      'GET /api/me/evolucao': { body: { exercicios: [backSquat, snatch] } },
    })
    const router = renderizar('/aluno/evolucao')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByRole('button', { name: /Snatch/ }))

    expect(await screen.findByRole('img', { name: /Evolução no Snatch/ })).toBeInTheDocument()
    expect(screen.getByText('Registre o próximo teste para comparar')).toBeInTheDocument()
    expect(router.state.location.search).toBe('?exercicio=2')
  })
})

const evolucaoTurmas: EvolucaoTurmas = {
  exercicios: [
    { id: 1, nome: 'Back Squat' },
    { id: 3, nome: 'Deadlift' },
  ],
  exercicio: { id: 1, nome: 'Back Squat' },
  ciclos: [
    { chave: '2025-2', rotulo: '2º sem. 2025', semana: '2025-09-08' },
    { chave: '2026-1', rotulo: '1º sem. 2026', semana: '2026-03-16' },
  ],
  turmas: [
    {
      turma: { id: 3, nome: 'Turma 18h' },
      porCiclo: [
        { ciclo: '2025-2', mediaKg: 97.5, alunos: 2 },
        { ciclo: '2026-1', mediaKg: 106.3, alunos: 2 },
      ],
    },
    {
      turma: { id: 2, nome: 'Turma 07h' },
      porCiclo: [
        { ciclo: '2025-2', mediaKg: 70, alunos: 1 },
        { ciclo: '2026-1', mediaKg: 63.8, alunos: 2 },
      ],
    },
  ],
  alunos: [
    {
      aluno: { id: 11, nome: 'Bruno Lima' },
      turma: { id: 3, nome: 'Turma 18h' },
      porCiclo: { '2025-2': 120, '2026-1': 130 },
      ultimoCiclo: '2026-1',
      ultimoKg: 130,
      anteriorKg: 120,
      variacaoKg: 10,
      variacaoPct: 8.3,
    },
    {
      aluno: { id: 12, nome: 'Carla Mendes' },
      turma: { id: 2, nome: 'Turma 07h' },
      porCiclo: { '2025-2': 70, '2026-1': 67.5 },
      ultimoCiclo: '2026-1',
      ultimoKg: 67.5,
      anteriorKg: 70,
      variacaoKg: -2.5,
      variacaoPct: -3.6,
    },
  ],
  resumo: {
    cicloAtual: '2026-1',
    cicloAnterior: '2025-2',
    alunosAvaliados: 4,
    mediaAtualKg: 85,
    medianaAtualKg: 75,
    mediaAnteriorKg: 88.3,
    evolucaoMediaKg: 5,
    evolucaoMediaPct: 4.9,
    comparaveis: 3,
    evoluiram: 2,
    mantiveram: 0,
    cairam: 1,
  },
}

describe('evolução no painel do treinador', () => {
  function simularTreinador() {
    return simularApi({
      'GET /api/auth/me': {
        body: { usuario: usuario({ id: 9, nome: 'Carlos', ehProfessor: true }) },
      },
      'GET /api/c/1/turmas': {
        body: [
          { id: 2, nome: 'Turma 07h', horario: '07:00', totalAlunos: 2 },
          { id: 3, nome: 'Turma 18h', horario: '18:00', totalAlunos: 2 },
        ],
      },
      'GET /api/c/1/evolucao': { body: evolucaoTurmas },
      'GET /api/c/1/evolucao/alunos/11': {
        body: {
          aluno: { id: 11, nome: 'Bruno Lima', turma: { id: 3, nome: 'Turma 18h' } },
          exercicios: [backSquat],
        },
      },
    })
  }

  it('mostra indicadores, média por turma e a evolução de cada aluno', async () => {
    simularTreinador()
    renderizar('/treinador/evolucao')

    expect(await screen.findByText('Semana de 16/03/2026 · 1º sem. 2026')).toBeInTheDocument()
    expect(screen.getByText('+5 kg')).toBeInTheDocument()
    expect(screen.getByText('+4,9% · 3 aluno(s) com os dois testes')).toBeInTheDocument()
    expect(screen.getByText('2 de 3')).toBeInTheDocument()

    // Legenda com uma linha por turma (identidade nunca só pela cor)
    const legenda = screen.getAllByRole('list', { name: 'Legenda' })[0]
    expect(
      within(legenda)
        .getAllByRole('listitem')
        .map((l) => l.textContent),
    ).toEqual(['Turma 18h', 'Turma 07h'])

    // Halteres: cada aluno com valores e variação em texto
    expect(
      screen.getByRole('button', { name: 'Bruno Lima: de 120 kg para 130 kg. Ver evolução' }),
    ).toHaveTextContent('▲ +10 kg')
    expect(
      screen.getByRole('button', { name: /Carla Mendes: de 70 kg para 67,5 kg/ }),
    ).toHaveTextContent('▼ −2,5 kg')
  })

  it('filtros vão para a URL e o detalhe do aluno abre numa janela', async () => {
    const chamadas = simularTreinador()
    const router = renderizar('/treinador/evolucao')
    const pessoa = userEvent.setup()

    await screen.findByText('2 de 3')
    await pessoa.selectOptions(screen.getByLabelText('Turma'), '3')
    await waitFor(() => expect(router.state.location.search).toBe('?turmaId=3'))
    expect(chamadas.some((c) => c.url === '/api/c/1/evolucao?turmaId=3')).toBe(true)

    await pessoa.click(screen.getByRole('button', { name: /Bruno Lima: de 120 kg para 130 kg/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Evolução de Bruno Lima' })
    expect(
      await within(dialogo).findByRole('img', { name: /Evolução no Back Squat/ }),
    ).toBeInTheDocument()
  })
})
