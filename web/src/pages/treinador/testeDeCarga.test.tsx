import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { hojeIso } from '../../lib/formato.ts'
import type { AlunoParaLancar } from '../../lib/tipos.ts'
import { renderizar, simularApi, usuario } from '../../test/apoio.tsx'

const alunos: AlunoParaLancar[] = [
  {
    aluno: { id: 1, nome: 'Ana Souza' },
    turma: { id: 3, nome: 'Turma 18h' },
    prAtual: { cargaKg: 80, dataTeste: '2026-03-15' },
    melhorAnteriorKg: 80,
    lancamento: null,
  },
  {
    aluno: { id: 2, nome: 'Bruno Lima' },
    turma: { id: 3, nome: 'Turma 18h' },
    prAtual: { cargaKg: 130, dataTeste: '2026-03-15' },
    melhorAnteriorKg: 130,
    lancamento: null,
  },
  {
    aluno: { id: 3, nome: 'Carla Mendes' },
    turma: { id: 3, nome: 'Turma 18h' },
    prAtual: null,
    melhorAnteriorKg: null,
    lancamento: { id: 50, cargaKg: 60, origem: 'TREINADOR' },
  },
]

function simular() {
  return simularApi({
    'GET /api/auth/me': {
      body: { usuario: usuario({ id: 9, nome: 'Carlos', ehProfessor: true }) },
    },
    'GET /api/c/1/turmas': {
      body: [{ id: 3, nome: 'Turma 18h', horario: '18:00', totalAlunos: 3 }],
    },
    'GET /api/c/1/exercicios': {
      body: [
        { id: 1, nome: 'Back Squat', categoria: 'LEVANTAMENTO', ativo: true, aliases: [] },
        { id: 2, nome: 'Thruster', categoria: 'OUTRO', ativo: false, aliases: [] },
      ],
    },
    'GET /api/c/1/lancamentos': { body: { alunos } },
    'POST /api/c/1/lancamentos': {
      status: 201,
      body: {
        criados: 2,
        atualizados: 0,
        novosRecordes: [{ usuarioId: 1, nome: 'Ana Souza', cargaKg: 85, anteriorKg: 80 }],
      },
    },
  })
}

describe('teste de carga — por turma', () => {
  it('lança a carga de vários alunos na mesma tela e salva tudo de uma vez', async () => {
    const chamadas = simular()
    renderizar('/treinador/teste-de-carga')
    const pessoa = userEvent.setup()

    // Data de hoje por padrão; exercícios inativos não aparecem
    expect(await screen.findByLabelText('Data do teste')).toHaveValue(hojeIso())
    expect(screen.queryByRole('option', { name: 'Thruster' })).not.toBeInTheDocument()
    await waitFor(() =>
      expect(chamadas.find((c) => c.url.startsWith('/api/c/1/lancamentos'))?.url).toBe(
        `/api/c/1/lancamentos?data=${hojeIso()}&exercicioId=1&turmaId=3`,
      ),
    )

    // Lançamento já feito hoje aparece preenchido, com opção de excluir
    expect(await screen.findByLabelText('Carga de Carla Mendes em Back Squat')).toHaveValue('60')
    expect(screen.getByRole('row', { name: /Carla Mendes/ })).toHaveTextContent('Lançado')

    // Digita e usa Enter para ir ao próximo aluno
    await pessoa.type(screen.getByLabelText('Carga de Ana Souza em Back Squat'), '85{Enter}')
    expect(screen.getByLabelText('Carga de Bruno Lima em Back Squat')).toHaveFocus()
    await pessoa.keyboard('127,5')

    expect(screen.getByRole('row', { name: /Ana Souza/ })).toHaveTextContent('▲ Novo recorde')
    expect(screen.getByRole('row', { name: /Bruno Lima/ })).toHaveTextContent('A salvar')

    await pessoa.click(screen.getByRole('button', { name: 'Salvar 2 carga(s)' }))

    expect(
      await screen.findByText(/2 carga\(s\) salva\(s\).*Novo recorde: Ana \(85 kg\)/),
    ).toBeInTheDocument()
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
      dataTeste: hojeIso(),
      exercicioId: 1,
      resultados: [
        { usuarioId: 1, cargaKg: 85 },
        { usuarioId: 2, cargaKg: 127.5 },
      ],
    })
  })

  it('não salva com carga inválida', async () => {
    simular()
    renderizar('/treinador/teste-de-carga')
    const pessoa = userEvent.setup()

    await pessoa.type(await screen.findByLabelText('Carga de Ana Souza em Back Squat'), '900')
    expect(screen.getByRole('row', { name: /Ana Souza/ })).toHaveTextContent('Carga inválida')
    expect(screen.getByRole('button', { name: /Salvar/ })).toBeDisabled()
  })
})

describe('teste de carga — por aluno', () => {
  it('pesquisa o aluno pelo nome e lança a carga individualmente', async () => {
    const chamadas = simular()
    renderizar('/treinador/teste-de-carga')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByRole('tab', { name: 'Por aluno' }))
    await pessoa.type(screen.getByLabelText('Aluno'), 'bru')
    await pessoa.click(await screen.findByRole('button', { name: /Bruno Lima/ }))

    expect(screen.getByText(/PR anterior 130 kg em 15\/03\/2026/)).toBeInTheDocument()
    await pessoa.type(screen.getByLabelText('Carga máxima em Back Squat (kg)'), '135')
    expect(screen.getByText(/Novo recorde! \+5 kg/)).toBeInTheDocument()
    await pessoa.click(screen.getByRole('button', { name: 'Salvar carga' }))

    await screen.findByText(/carga\(s\) salva\(s\)/)
    expect(chamadas.find((c) => c.metodo === 'POST')?.corpo).toEqual({
      dataTeste: hojeIso(),
      exercicioId: 1,
      resultados: [{ usuarioId: 2, cargaKg: 135 }],
    })
    expect(chamadas.some((c) => c.url.includes('busca=bru'))).toBe(true)
  })
})
