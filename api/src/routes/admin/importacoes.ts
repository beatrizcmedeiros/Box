import { Router } from 'express'
import { z } from 'zod'
import { limparTitulo } from '../../domain/importacao/associar.ts'
import { dataDoTesteSchema, formatarData, paraData } from '../../lib/datas.ts'
import { ErroHttp, naoEncontrado } from '../../lib/erros.ts'
import { prisma } from '../../lib/prisma.ts'
import { normalizarTexto } from '../../lib/texto.ts'
import { cargaKgSchema } from '../../lib/validacao.ts'
import {
  aliasesDoContexto,
  alunosDoContexto,
  type Contexto,
  donoDoAlias,
  exerciciosDoContexto,
  importacoesDoContexto,
  vinculoDoContexto,
} from '../../services/contexto.ts'
import { gerarPrevia } from '../../services/importacao.ts'
import { idSchema, parseId } from './comum.ts'
import { buscarTurma } from './turmas.ts'

const previaSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(1, 'O arquivo não tem texto legível')
    .max(50_000, 'Texto muito longo'),
  turmaId: idSchema.nullish().transform((v) => v ?? null),
})

const confirmacaoSchema = z.object({
  dataTeste: dataDoTesteSchema,
  turmaId: idSchema.nullish().transform((v) => v ?? null),
  nomeArquivo: z.string().trim().min(1).max(200).default('Texto colado'),
  resultados: z
    .array(
      z.object({
        usuarioId: idSchema,
        exercicioId: idSchema,
        cargaKg: cargaKgSchema,
        /** Como o nome apareceu na lista; salvo como apelido para as próximas importações. */
        apelido: z.string().max(80).nullish(),
      }),
    )
    .min(1, 'Selecione pelo menos um resultado')
    .max(1000),
  /** Títulos de seção a lembrar como nome alternativo do exercício (ex.: "agachamento"). */
  aliasesExercicio: z
    .array(z.object({ exercicioId: idSchema, alias: z.string().max(60) }))
    .default([]),
})

/** Importação da lista do teste de força para os alunos do contexto. */
export function importacoesRouter() {
  const router = Router()

  router.get('/', async (req, res) => {
    const importacoes = await prisma.importacao.findMany({
      where: importacoesDoContexto(req.contexto!),
      orderBy: { criadoEm: 'desc' },
      take: 50,
      include: {
        turma: { select: { id: true, nome: true } },
        treinador: { select: { nome: true } },
        _count: { select: { testesCarga: true } },
      },
    })
    res.json(
      importacoes.map((i) => ({
        id: i.id,
        dataTeste: formatarData(i.dataTeste),
        nomeArquivo: i.nomeArquivo,
        status: i.status,
        totalLinhas: i.totalLinhas,
        resultadosAtuais: i._count.testesCarga,
        turma: i.turma,
        treinador: i.treinador.nome,
        criadoEm: i.criadoEm,
      })),
    )
  })

  /** Interpreta o texto extraído do PDF (ou colado) e devolve a prévia. Nada é gravado. */
  router.post('/previa', async (req, res) => {
    const ctx = req.contexto!
    const { texto, turmaId } = previaSchema.parse(req.body)
    if (turmaId) await buscarTurma(ctx, turmaId)
    const previa = await gerarPrevia(ctx, texto, turmaId)
    if (previa.secoes.length === 0) {
      throw new ErroHttp(
        400,
        'Nenhum resultado encontrado. A lista deve ter uma linha por aluno, como "Ana 55kg".',
      )
    }
    res.json(previa)
  })

  /** Grava os resultados revisados. */
  router.post('/', async (req, res) => {
    const ctx = req.contexto!
    const dados = confirmacaoSchema.parse(req.body)
    await validarResultados(ctx, dados.resultados)
    if (dados.turmaId) await buscarTurma(ctx, dados.turmaId)

    const dataTeste = paraData(dados.dataTeste)
    const lancadoPorId = req.usuario!.id
    const academiaId = ctx.tipo === 'academia' ? ctx.academiaId : null

    const resumo = await prisma.$transaction(async (tx) => {
      const importacao = await tx.importacao.create({
        data: {
          treinadorId: lancadoPorId,
          ...importacoesDoContexto(ctx),
          turmaId: dados.turmaId,
          dataTeste,
          nomeArquivo: dados.nomeArquivo,
          status: 'CONFIRMADA',
          totalLinhas: dados.resultados.length,
        },
      })

      let criados = 0
      let atualizados = 0
      for (const r of dados.resultados) {
        // Reimportar a mesma lista corrige a carga em vez de duplicar o teste
        const existente = await tx.testeCarga.findFirst({
          where: {
            usuarioId: r.usuarioId,
            exercicioId: r.exercicioId,
            dataTeste,
            origem: 'IMPORTACAO',
          },
        })
        const comum = { cargaKg: r.cargaKg, importacaoId: importacao.id, lancadoPorId, academiaId }
        if (existente) {
          await tx.testeCarga.update({ where: { id: existente.id }, data: comum })
          atualizados++
        } else {
          await tx.testeCarga.create({
            data: {
              ...comum,
              usuarioId: r.usuarioId,
              exercicioId: r.exercicioId,
              dataTeste,
              origem: 'IMPORTACAO',
            },
          })
          criados++
        }
      }

      // Apelidos ficam no vínculo do aluno com este contexto, só quando diferem do nome.
      // A escolha mais recente prevalece: o apelido sai de outro aluno do mesmo contexto.
      const vinculos = await tx.vinculoAluno.findMany({
        where: {
          ...vinculoDoContexto(ctx),
          alunoId: { in: dados.resultados.map((r) => r.usuarioId) },
        },
        include: { aluno: { select: { nome: true } } },
      })
      const vinculoDe = new Map(vinculos.map((v) => [v.alunoId, v]))
      let apelidosSalvos = 0
      for (const r of dados.resultados) {
        const apelido = r.apelido ? normalizarTexto(r.apelido) : ''
        const vinculo = vinculoDe.get(r.usuarioId)!
        if (!apelido || apelido === normalizarTexto(vinculo.aluno.nome)) continue
        await tx.apelidoVinculo.deleteMany({
          where: { apelido, vinculo: vinculoDoContexto(ctx), NOT: { vinculoId: vinculo.id } },
        })
        await tx.apelidoVinculo.upsert({
          where: { vinculoId_apelido: { vinculoId: vinculo.id, apelido } },
          update: {},
          create: { vinculoId: vinculo.id, apelido },
        })
        apelidosSalvos++
      }

      // Títulos de seção viram nomes alternativos do exercício, só neste contexto
      let aliasesSalvos = 0
      for (const { exercicioId, alias } of dados.aliasesExercicio) {
        const limpo = limparTitulo(alias)
        if (!limpo) continue
        const visivel = await tx.exercicio.findFirst({
          where: { id: exercicioId, ...exerciciosDoContexto(ctx) },
        })
        if (!visivel) continue
        const jaExiste = await tx.exercicioAlias.findFirst({
          where: { alias: limpo, exercicioId, ...aliasesDoContexto(ctx) },
        })
        if (jaExiste) continue
        await tx.exercicioAlias.deleteMany({ where: { alias: limpo, ...donoDoAlias(ctx) } })
        await tx.exercicioAlias.create({ data: { alias: limpo, exercicioId, ...donoDoAlias(ctx) } })
        aliasesSalvos++
      }

      return { importacaoId: importacao.id, criados, atualizados, apelidosSalvos, aliasesSalvos }
    })

    res.status(201).json(resumo)
  })

  /** Desfaz uma importação do contexto: remove os testes gravados por ela e marca como cancelada. */
  router.delete('/:id', async (req, res) => {
    const id = parseId(req.params.id)
    const importacao = await prisma.importacao.findFirst({
      where: { id, ...importacoesDoContexto(req.contexto!) },
    })
    if (!importacao) throw naoEncontrado('Importação')
    if (importacao.status === 'CANCELADA')
      throw new ErroHttp(409, 'Esta importação já foi desfeita')

    const { count } = await prisma.$transaction(async (tx) => {
      const removidos = await tx.testeCarga.deleteMany({
        where: { importacaoId: id, origem: 'IMPORTACAO' },
      })
      await tx.importacao.update({ where: { id }, data: { status: 'CANCELADA' } })
      return removidos
    })
    res.json({ removidos: count })
  })

  return router
}

async function validarResultados(
  ctx: Contexto,
  resultados: { usuarioId: number; exercicioId: number }[],
) {
  const pares = new Set<string>()
  for (const r of resultados) {
    const chave = `${r.usuarioId}:${r.exercicioId}`
    if (pares.has(chave)) {
      throw new ErroHttp(400, 'Há mais de um resultado para o mesmo aluno no mesmo exercício')
    }
    pares.add(chave)
  }

  const idsAlunos = [...new Set(resultados.map((r) => r.usuarioId))]
  const alunosValidos = await prisma.usuario.count({
    where: { id: { in: idsAlunos }, ...alunosDoContexto(ctx) },
  })
  if (alunosValidos !== idsAlunos.length)
    throw new ErroHttp(400, 'Há alunos inválidos, inativos ou sem vínculo na lista')

  const idsExercicios = [...new Set(resultados.map((r) => r.exercicioId))]
  const exerciciosValidos = await prisma.exercicio.count({
    where: { id: { in: idsExercicios }, ativo: true, ...exerciciosDoContexto(ctx) },
  })
  if (exerciciosValidos !== idsExercicios.length) {
    throw new ErroHttp(400, 'Há exercícios inválidos ou inativos na lista')
  }
}
