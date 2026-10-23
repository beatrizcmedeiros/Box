import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import type { DetalhePr, ResumoPr } from '../../lib/tipos.ts'
import { renderizar, simularApi, usuario } from '../../test/apoio.tsx'

const percentuais = (pr: number) =>
  [35, 40, 45, 50, 55].map((p) => ({ percentual: p, cargaKg: (pr * p) / 100 }))

const ultimo: ResumoPr = {
  exercicio: { id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO' },
  base: 'ultimo',
  pr: { id: 11, dataTeste: '2026-03-15', cargaKg: 100, origem: 'ALUNO' },
  percentuais: percentuais(100),
  novoRecorde: false,
  diferencaKg: -10,
}
const maior: ResumoPr = {
  ...ultimo,
  base: 'maior',
  pr: { id: 10, dataTeste: '2025-09-10', cargaKg: 110, origem: 'TREINADOR' },
  percentuais: percentuais(110),
}

const sessaoAluno = { 'GET /api/auth/me': { body: { usuario: usuario() } } }

afterEach(() => localStorage.clear())

describe('base das porcentagens', () => {
  it('troca entre o último PR e o maior PR e lembra a escolha', async () => {
    const chamadas = simularApi({
      ...sessaoAluno,
      'GET /api/me/prs?base=ultimo': { body: [ultimo] },
      'GET /api/me/prs?base=maior': { body: [maior] },
    })
    renderizar('/aluno/percentuais')
    const pessoa = userEvent.setup()

    expect(await screen.findByRole('link', { name: /^Back Squat PR 100 kg/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Último PR' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await pessoa.click(screen.getByRole('button', { name: 'Maior PR' }))
    expect(await screen.findByRole('link', { name: /^Back Squat PR 110 kg/ })).toBeInTheDocument()
    expect(chamadas.some((c) => c.url === '/api/me/prs?base=maior')).toBe(true)
    expect(localStorage.getItem('prbox.base-pr')).toBe('maior')
  })
})

describe('editar PR', () => {
  it('o aluno corrige a carga de qualquer PR, inclusive o lançado pelo treinador', async () => {
    const detalhe: DetalhePr = {
      ...ultimo,
      historico: [ultimo.pr, maior.pr],
    }
    const chamadas = simularApi({
      ...sessaoAluno,
      'GET /api/me/prs/1?base=ultimo': { body: detalhe },
      'PUT /api/me/prs/lancamentos/10': {
        body: { ...maior.pr, cargaKg: 112.5 },
      },
    })
    renderizar('/aluno/exercicios/1')
    const pessoa = userEvent.setup()

    await pessoa.click(
      await screen.findByRole('button', { name: 'Editar lançamento de 10/09/2025' }),
    )
    const carga = screen.getByLabelText('Carga máxima (PR) em kg')
    expect(carga).toHaveValue('110')
    await pessoa.clear(carga)
    await pessoa.type(carga, '112,5')
    await pessoa.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() =>
      expect(chamadas.find((c) => c.metodo === 'PUT')?.corpo).toEqual({
        dataTeste: '2025-09-10',
        cargaKg: 112.5,
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})

describe('perfil', () => {
  it('o aluno não tem a opção de virar professor', async () => {
    simularApi(sessaoAluno)
    renderizar('/aluno/perfil')
    expect(await screen.findByRole('button', { name: 'Trocar senha' })).toBeInTheDocument()
    expect(screen.queryByText('Sou professor')).not.toBeInTheDocument()
    expect(screen.queryByText(/área do professor/)).not.toBeInTheDocument()
  })
})
