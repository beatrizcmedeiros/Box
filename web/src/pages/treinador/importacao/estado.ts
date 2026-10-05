// Estado editável da prévia de importação e regras de validação (sem React, fácil de testar).

import { lerNumero } from '../../../lib/formato.ts'
import type { Previa } from '../../../lib/tipos.ts'

export const CARGA_MINIMA_KG = 1
export const CARGA_MAXIMA_KG = 500

export type SituacaoLinha = 'encontrado' | 'sugestao' | 'nao_encontrado' | 'problema'

export type LinhaEditavel = {
  chave: string
  secao: number
  numero: number
  texto: string
  nomeLido: string
  alunoId: number | null
  carga: string
  incluir: boolean
  situacao: SituacaoLinha
  /** Explicação da situação (ex.: "Há 3 alunos com esse nome"). */
  detalhe: string | null
  /** Alunos sugeridos para esta linha (aparecem primeiro na lista). */
  candidatos: number[]
  /** O treinador escolheu ou confirmou o aluno — o nome lido vira apelido. */
  escolhaManual: boolean
}

export type SecaoEditavel = {
  titulo: string | null
  tituloLimpo: string
  exercicioId: number | null
  candidatos: number[]
  /** Salvar o título como nome alternativo do exercício escolhido. */
  lembrarTitulo: boolean
  reconhecido: boolean
}

export function montarEstado(previa: Previa) {
  const secoes: SecaoEditavel[] = previa.secoes.map((s) => ({
    titulo: s.titulo,
    tituloLimpo: s.tituloLimpo,
    exercicioId: s.exercicio.status === 'encontrado' ? s.exercicio.exercicioId : null,
    candidatos: s.exercicio.status === 'ambiguo' ? s.exercicio.candidatos : [],
    lembrarTitulo: s.exercicio.status !== 'encontrado' && s.tituloLimpo !== '',
    reconhecido: s.exercicio.status === 'encontrado',
  }))

  const linhas: LinhaEditavel[] = previa.secoes.flatMap((s, indiceSecao) =>
    s.linhas.map((l) => {
      const base = {
        chave: `${indiceSecao}-${l.numero}`,
        secao: indiceSecao,
        numero: l.numero,
        texto: l.texto,
        nomeLido: l.nome ?? l.texto,
        carga: l.cargaKg === null ? '' : String(l.cargaKg).replace('.', ','),
        escolhaManual: false,
      }
      if (l.problema) {
        return {
          ...base,
          alunoId: l.aluno?.status === 'encontrado' ? l.aluno.aluno.id : null,
          incluir: false,
          situacao: 'problema' as const,
          detalhe: l.problema,
          candidatos: [],
        }
      }
      const aluno = l.aluno!
      switch (aluno.status) {
        case 'encontrado':
          return {
            ...base,
            alunoId: aluno.aluno.id,
            incluir: true,
            situacao: 'encontrado' as const,
            detalhe: aluno.por === 'apelido' ? 'Reconhecido pelo apelido' : null,
            candidatos: [],
          }
        case 'sugestao':
          // Sugestões nunca entram sozinhas: o treinador precisa confirmar
          return {
            ...base,
            alunoId: aluno.aluno.id,
            incluir: false,
            situacao: 'sugestao' as const,
            detalhe: aluno.motivo,
            candidatos: aluno.candidatos.map((c) => c.id),
          }
        default:
          return {
            ...base,
            alunoId: null,
            incluir: false,
            situacao: 'nao_encontrado' as const,
            detalhe: 'Aluno não encontrado — escolha na lista ou cadastre-o',
            candidatos: [],
          }
      }
    }),
  )

  return { secoes, linhas }
}

export const cargaValida = (texto: string) => {
  const kg = lerNumero(texto)
  return (
    !Number.isNaN(kg) &&
    kg >= CARGA_MINIMA_KG &&
    kg <= CARGA_MAXIMA_KG &&
    Number.isInteger(Math.round(kg * 1e4) / 100)
  )
}

/** Problema que impede incluir a linha (ou null se está pronta). */
export function pendenciaDaLinha(linha: LinhaEditavel, secao: SecaoEditavel): string | null {
  if (!linha.alunoId) return 'Escolha o aluno'
  if (!cargaValida(linha.carga))
    return `Carga inválida (${CARGA_MINIMA_KG} a ${CARGA_MAXIMA_KG} kg)`
  if (!secao.exercicioId) return 'Escolha o exercício da seção'
  return null
}

/** Chaves das linhas incluídas que repetem aluno + exercício. */
export function linhasDuplicadas(linhas: LinhaEditavel[], secoes: SecaoEditavel[]): Set<string> {
  const vistos = new Map<string, string[]>()
  for (const l of linhas) {
    const exercicioId = secoes[l.secao].exercicioId
    if (!l.incluir || !l.alunoId || !exercicioId) continue
    const chave = `${l.alunoId}:${exercicioId}`
    vistos.set(chave, [...(vistos.get(chave) ?? []), l.chave])
  }
  return new Set([...vistos.values()].filter((c) => c.length > 1).flat())
}

export function montarEnvio(
  linhas: LinhaEditavel[],
  secoes: SecaoEditavel[],
  lembrarApelidos: boolean,
) {
  const incluidas = linhas.filter((l) => l.incluir && !pendenciaDaLinha(l, secoes[l.secao]))
  const secoesUsadas = new Set(incluidas.map((l) => l.secao))
  return {
    resultados: incluidas.map((l) => ({
      usuarioId: l.alunoId!,
      exercicioId: secoes[l.secao].exercicioId!,
      cargaKg: lerNumero(l.carga),
      apelido:
        lembrarApelidos && (l.escolhaManual || l.situacao !== 'encontrado') ? l.nomeLido : null,
    })),
    aliasesExercicio: secoes
      .map((s, i) => ({ s, i }))
      .filter(
        ({ s, i }) => secoesUsadas.has(i) && s.lembrarTitulo && s.exercicioId && s.tituloLimpo,
      )
      .map(({ s }) => ({ exercicioId: s.exercicioId!, alias: s.tituloLimpo })),
  }
}
