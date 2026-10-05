import {
  type AlunoParaAssociar,
  associarAluno,
  associarExercicio,
  type ExercicioParaAssociar,
  limparTitulo,
  type ResultadoAluno,
  type ResultadoExercicio,
} from '../domain/importacao/associar.ts'
import { lerTexto } from '../domain/importacao/lerTexto.ts'
import { prisma } from '../lib/prisma.ts'

export type LinhaPrevia = {
  numero: number
  texto: string
  nome: string | null
  cargaKg: number | null
  problema: string | null
  aluno: ResultadoAluno | null
  /** O mesmo aluno aparece mais de uma vez na seção. */
  duplicado: boolean
}

export type SecaoPrevia = {
  titulo: string | null
  /** Título sem palavras genéricas — pode ser salvo como nome alternativo do exercício. */
  tituloLimpo: string
  exercicio: ResultadoExercicio
  linhas: LinhaPrevia[]
}

async function carregarCadastro() {
  const [alunos, exercicios] = await Promise.all([
    prisma.usuario.findMany({
      where: { perfil: 'ALUNO', ativo: true },
      select: {
        id: true,
        nome: true,
        turmaId: true,
        turma: { select: { nome: true } },
        apelidos: { select: { apelido: true } },
      },
      orderBy: { nome: 'asc' },
    }),
    prisma.exercicio.findMany({
      where: { ativo: true },
      select: { id: true, nome: true, aliases: { select: { alias: true } } },
      orderBy: { nome: 'asc' },
    }),
  ])
  return { alunos, exercicios }
}

/**
 * Interpreta o texto da lista do treinador e associa nomes a alunos e títulos a exercícios.
 * Nada é gravado: o treinador revisa a prévia e confirma.
 */
export async function gerarPrevia(texto: string, turmaId: number | null) {
  const { alunos, exercicios } = await carregarCadastro()

  const paraAssociar: AlunoParaAssociar[] = alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    turmaId: a.turmaId,
    apelidos: a.apelidos.map((x) => x.apelido),
  }))
  const exerciciosParaAssociar: ExercicioParaAssociar[] = exercicios.map((e) => ({
    id: e.id,
    nome: e.nome,
    aliases: e.aliases.map((x) => x.alias),
  }))

  const secoes: SecaoPrevia[] = lerTexto(texto).map((secao) => {
    const linhas = secao.linhas.map((linha) => ({
      ...linha,
      aluno: linha.nome ? associarAluno(linha.nome, paraAssociar, turmaId) : null,
      duplicado: false,
    }))

    const contagem = new Map<number, number>()
    for (const l of linhas) {
      if (l.aluno?.status === 'encontrado') {
        contagem.set(l.aluno.aluno.id, (contagem.get(l.aluno.aluno.id) ?? 0) + 1)
      }
    }
    for (const l of linhas) {
      l.duplicado = l.aluno?.status === 'encontrado' && contagem.get(l.aluno.aluno.id)! > 1
    }

    return {
      titulo: secao.titulo,
      tituloLimpo: secao.titulo ? limparTitulo(secao.titulo) : '',
      exercicio: associarExercicio(secao.titulo, exerciciosParaAssociar),
      linhas,
    }
  })

  const todas = secoes.flatMap((s) => s.linhas)
  return {
    secoes,
    resumo: {
      linhas: todas.length,
      encontrados: todas.filter((l) => !l.problema && l.aluno?.status === 'encontrado').length,
      sugestoes: todas.filter((l) => l.aluno?.status === 'sugestao').length,
      naoEncontrados: todas.filter((l) => l.aluno?.status === 'nao_encontrado').length,
      comProblema: todas.filter((l) => l.problema).length,
    },
    // Listas para o treinador escolher manualmente na prévia
    alunos: alunos.map((a) => ({ id: a.id, nome: a.nome, turma: a.turma?.nome ?? null })),
    exercicios: exercicios.map((e) => ({ id: e.id, nome: e.nome })),
  }
}
