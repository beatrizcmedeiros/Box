import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Previa } from '../../../lib/tipos.ts'
import { renderizar, simularApi, usuario } from '../../../test/apoio.tsx'

// A leitura real do PDF (pdf.js + OCR) roda só no navegador; aqui ela é simulada
vi.mock('../../../lib/extrairTextoPdf.ts', () => ({
  extrairTextoPdf: vi.fn<typeof import('../../../lib/extrairTextoPdf.ts').extrairTextoPdf>(
    async (_arquivo, aoProgredir) => {
      aoProgredir({ etapa: 'Lendo a página 1 de 1…', percentual: 50 })
      return { texto: 'Teste agachamento\nCarla 55kg\nToninho 85', usouOcr: true, paginas: 1 }
    },
  ),
}))

const treinador = usuario({ id: 9, nome: 'Carlos Treinador', perfil: 'TREINADOR' })

const previa: Previa = {
  secoes: [
    {
      titulo: 'Teste agachamento',
      tituloLimpo: 'agachamento',
      exercicio: { status: 'ambiguo', candidatos: [1, 2] },
      linhas: [
        {
          numero: 2,
          texto: 'Carla 55kg',
          nome: 'Carla',
          cargaKg: 55,
          problema: null,
          duplicado: false,
          aluno: {
            status: 'encontrado',
            aluno: { id: 10, nome: 'Carla Mendes' },
            por: 'primeiro_nome',
          },
        },
        {
          numero: 3,
          texto: 'Toninho 85',
          nome: 'Toninho',
          cargaKg: 85,
          problema: null,
          duplicado: false,
          aluno: { status: 'nao_encontrado', candidatos: [] },
        },
      ],
    },
  ],
  resumo: { linhas: 2, encontrados: 1, sugestoes: 0, naoEncontrados: 1, comProblema: 0 },
  alunos: [
    { id: 10, nome: 'Carla Mendes', turma: 'Turma 18h' },
    { id: 11, nome: 'Antônio Pereira', turma: 'Turma 18h' },
  ],
  exercicios: [
    { id: 1, nome: 'Back Squat' },
    { id: 2, nome: 'Front Squat' },
    { id: 3, nome: 'Deadlift' },
  ],
}

function simular() {
  return simularApi({
    'GET /api/auth/me': { body: { usuario: treinador } },
    'GET /api/admin/turmas': {
      body: [{ id: 3, nome: 'Turma 18h', horario: '18:00', totalAlunos: 2 }],
    },
    'GET /api/admin/importacoes': { body: [] },
    'POST /api/admin/importacoes/previa': { body: previa },
    'POST /api/admin/importacoes': {
      status: 201,
      body: { importacaoId: 1, criados: 2, atualizados: 0, apelidosSalvos: 1, aliasesSalvos: 1 },
    },
  })
}

describe('importar cargas', () => {
  it('lê o PDF no navegador, revisa e confirma a importação', async () => {
    const chamadas = simular()
    renderizar('/treinador/importar')
    const pessoa = userEvent.setup()

    const data = await screen.findByLabelText('Data do teste de carga')
    await pessoa.clear(data)
    await pessoa.type(data, '2026-09-20')
    await pessoa.upload(
      screen.getByLabelText('Arquivo PDF'),
      new File(['%PDF'], 'Notes.pdf', { type: 'application/pdf' }),
    )
    await pessoa.click(screen.getByRole('button', { name: 'Ler resultados' }))

    // Prévia: o texto extraído foi enviado para a API (o PDF não)
    const revisao = await screen.findByRole('region', { name: 'Revisão da importação' })
    expect(chamadas.find((c) => c.url === '/api/admin/importacoes/previa')?.corpo).toEqual({
      texto: 'Teste agachamento\nCarla 55kg\nToninho 85',
      turmaId: null,
    })
    expect(within(revisao).getByRole('button', { name: 'Confirmar importação (0)' })).toBeDisabled()

    // "agachamento" é ambíguo: o treinador escolhe o exercício
    await pessoa.selectOptions(within(revisao).getByRole('combobox', { name: 'Exercício' }), '1')
    expect(within(revisao).getByRole('button', { name: 'Confirmar importação (1)' })).toBeEnabled()

    // "Toninho" não foi encontrado: o treinador associa ao aluno certo
    await pessoa.selectOptions(screen.getByLabelText('Aluno da linha 3'), '11')
    await pessoa.click(within(revisao).getByRole('button', { name: 'Confirmar importação (2)' }))

    expect(
      await screen.findByText(/2 resultado\(s\) importado\(s\) para 20\/09\/2026/),
    ).toBeInTheDocument()
    await waitFor(() =>
      expect(
        chamadas.find((c) => c.metodo === 'POST' && c.url === '/api/admin/importacoes')?.corpo,
      ).toEqual({
        dataTeste: '2026-09-20',
        turmaId: null,
        nomeArquivo: 'Notes.pdf',
        resultados: [
          { usuarioId: 10, exercicioId: 1, cargaKg: 55, apelido: null },
          { usuarioId: 11, exercicioId: 1, cargaKg: 85, apelido: 'Toninho' },
        ],
        aliasesExercicio: [{ exercicioId: 1, alias: 'agachamento' }],
      }),
    )
  })

  it('aceita o texto colado', async () => {
    const chamadas = simular()
    renderizar('/treinador/importar')
    const pessoa = userEvent.setup()

    await pessoa.click(await screen.findByRole('tab', { name: 'Colar texto' }))
    await pessoa.type(screen.getByLabelText('Texto da lista'), 'Teste agachamento{enter}Carla 55kg')
    await pessoa.click(screen.getByRole('button', { name: 'Ler resultados' }))

    await screen.findByRole('region', { name: 'Revisão da importação' })
    expect(chamadas.find((c) => c.url === '/api/admin/importacoes/previa')?.corpo).toEqual({
      texto: 'Teste agachamento\nCarla 55kg',
      turmaId: null,
    })
  })
})
