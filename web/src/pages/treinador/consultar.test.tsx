import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { ConsultaCargas } from '../../lib/tipos.ts'
import { renderizar, simularApi, usuario } from '../../test/apoio.tsx'

const treinador = usuario({ id: 9, nome: 'Carlos Treinador', perfil: 'TREINADOR' })

const resposta: ConsultaCargas = {
  resultados: [
    {
      aluno: { id: 1, nome: 'Bruno Lima' },
      turma: { id: 3, nome: 'Turma 18h' },
      exercicio: { id: 1, nome: 'Back Squat' },
      dataTeste: '2026-03-15',
      cargaKg: 130,
      origem: 'IMPORTACAO',
      variacaoKg: 10,
    },
    {
      aluno: { id: 2, nome: 'Helena Martins' },
      turma: { id: 3, nome: 'Turma 18h' },
      exercicio: { id: 1, nome: 'Back Squat' },
      dataTeste: '2026-03-20',
      cargaKg: 72.5,
      origem: 'ALUNO',
      variacaoKg: -2.5,
    },
  ],
  totais: { registros: 2, alunos: 2, maiorCargaKg: 130, mediaKg: 101.3 },
  pagina: 1,
  porPagina: 25,
  totalPaginas: 1,
}

function simular() {
  return simularApi({
    'GET /api/auth/me': { body: { usuario: treinador } },
    'GET /api/admin/turmas': {
      body: [{ id: 3, nome: 'Turma 18h', horario: '18:00', totalAlunos: 2 }],
    },
    'GET /api/admin/exercicios': {
      body: [{ id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO', ativo: true, aliases: [] }],
    },
    'GET /api/admin/cargas': { body: resposta },
  })
}

const ultimaConsulta = (chamadas: { url: string }[]) =>
  new URLSearchParams(
    chamadas
      .filter((c) => c.url.startsWith('/api/admin/cargas'))
      .at(-1)!
      .url.split('?')[1],
  )

describe('consultar cargas', () => {
  it('mostra totais, cargas, variação e quem informou o resultado', async () => {
    simular()
    renderizar('/treinador/consultar')

    const tabela = await screen.findByRole('table')
    const [bruno, helena] = within(tabela).getAllByRole('row').slice(1)
    expect(bruno).toHaveTextContent('Bruno LimaTurma 18hBack Squat15/03/2026130 kg+10 kg')
    expect(helena).toHaveTextContent('informado pelo aluno')
    expect(helena).toHaveTextContent('72,5 kg−2,5 kg')
    expect(screen.getByText('Alunos no filtro').nextSibling).toHaveTextContent('2')
    expect(screen.getByText('Maior carga').nextSibling).toHaveTextContent('130 kg')
  })

  it('combina filtros, mostra os filtros ativos e permite removê-los', async () => {
    const chamadas = simular()
    const router = renderizar('/treinador/consultar')
    const pessoa = userEvent.setup()

    await screen.findByRole('table')
    await pessoa.selectOptions(screen.getByLabelText('Exercício'), '1')
    await pessoa.selectOptions(screen.getByLabelText('Turma'), '3')
    await pessoa.type(screen.getByLabelText('Aluno'), 'bru')

    await waitFor(() => {
      const q = ultimaConsulta(chamadas)
      expect([q.get('exercicioId'), q.get('turmaId'), q.get('busca')]).toEqual(['1', '3', 'bru'])
    })
    expect(router.state.location.search).toContain('exercicioId=1')
    expect(screen.getByText('Média da turma')).toBeInTheDocument()

    await pessoa.click(screen.getByRole('button', { name: 'Remover filtro Turma: Turma 18h' }))
    await waitFor(() => expect(ultimaConsulta(chamadas).get('turmaId')).toBeNull())

    await pessoa.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await waitFor(() => {
      const q = ultimaConsulta(chamadas)
      expect([q.get('exercicioId'), q.get('busca')]).toEqual([null, null])
    })
  })

  it('ordena ao clicar no cabeçalho e respeita filtros vindos da URL', async () => {
    const chamadas = simular()
    renderizar('/treinador/consultar?exercicioId=1')
    const pessoa = userEvent.setup()

    await screen.findByRole('table')
    expect(ultimaConsulta(chamadas).get('exercicioId')).toBe('1')
    expect(
      screen.getByRole('button', { name: 'Remover filtro Exercício: Back Squat' }),
    ).toBeInTheDocument()

    await pessoa.click(screen.getByRole('button', { name: /Aluno/ }))
    await waitFor(() => {
      const q = ultimaConsulta(chamadas)
      expect([q.get('ordenar'), q.get('direcao')]).toEqual(['aluno', 'asc'])
    })
    await pessoa.click(screen.getByRole('button', { name: /Aluno/ }))
    await waitFor(() => expect(ultimaConsulta(chamadas).get('direcao')).toBe('desc'))
  })
})
