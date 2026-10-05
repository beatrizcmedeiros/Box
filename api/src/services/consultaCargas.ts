import { Prisma } from '../generated/prisma/client.ts'
import { formatarData } from '../lib/datas.ts'
import { prisma } from '../lib/prisma.ts'

export const ORDENACOES = ['carga', 'aluno', 'data', 'variacao'] as const
export type Ordenacao = (typeof ORDENACOES)[number]

export type FiltrosConsulta = {
  /** Parte do nome ou apelido do aluno (sem diferenciar acentos/maiúsculas). */
  busca?: string
  exercicioId?: number
  turmaId?: number
  ordenar: Ordenacao
  direcao: 'asc' | 'desc'
  pagina: number
  porPagina: number
}

type LinhaSql = {
  aluno_id: number
  aluno_nome: string
  turma_id: number | null
  turma_nome: string | null
  exercicio_id: number
  exercicio_nome: string
  data_teste: Date
  carga_kg: number
  origem: 'ALUNO' | 'IMPORTACAO'
  carga_anterior: number | null
}

type TotaisSql = { registros: number; alunos: number; maior: number | null; media: number | null }

// Colunas de ordenação (fixas — nunca vindas do usuário); desempate sempre pelo nome
const COLUNAS: Record<Ordenacao, Prisma.Sql> = {
  carga: Prisma.sql`v.carga_kg`,
  aluno: Prisma.sql`u.nome`,
  data: Prisma.sql`v.data_teste`,
  variacao: Prisma.sql`(v.carga_kg - a.carga_kg)`,
}

/**
 * PR vigente (teste mais recente) de cada aluno ativo em cada exercício, com a variação
 * em relação ao teste anterior. Filtros combináveis por aluno, exercício e turma.
 */
export async function consultarCargas(filtros: FiltrosConsulta) {
  const condicoes: Prisma.Sql[] = [Prisma.sql`u.perfil = 'ALUNO'`, Prisma.sql`u.ativo`]
  if (filtros.exercicioId) condicoes.push(Prisma.sql`t.exercicio_id = ${filtros.exercicioId}`)
  if (filtros.turmaId) condicoes.push(Prisma.sql`u.turma_id = ${filtros.turmaId}`)
  if (filtros.busca) {
    const termo = `%${filtros.busca.replace(/[\\%_]/g, '\\$&')}%`
    condicoes.push(Prisma.sql`(
      unaccent(u.nome) ILIKE unaccent(${termo})
      OR EXISTS (SELECT 1 FROM aluno_apelido ap WHERE ap.usuario_id = u.id AND ap.apelido ILIKE unaccent(${termo}))
    )`)
  }

  const testesNumerados = Prisma.sql`
    WITH numerados AS (
      SELECT t.usuario_id, t.exercicio_id, t.data_teste, t.carga_kg::float8 AS carga_kg, t.origem,
             ROW_NUMBER() OVER (
               PARTITION BY t.usuario_id, t.exercicio_id
               ORDER BY t.data_teste DESC, t.criado_em DESC, t.id DESC
             ) AS ordem
      FROM testes_carga t
      JOIN usuarios u ON u.id = t.usuario_id
      WHERE ${Prisma.join(condicoes, ' AND ')}
    )`

  const deVigentes = Prisma.sql`
    FROM numerados v
    LEFT JOIN numerados a
      ON a.usuario_id = v.usuario_id AND a.exercicio_id = v.exercicio_id AND a.ordem = 2
    JOIN usuarios u ON u.id = v.usuario_id
    LEFT JOIN turmas tu ON tu.id = u.turma_id
    JOIN exercicios e ON e.id = v.exercicio_id
    WHERE v.ordem = 1`

  const direcao = filtros.direcao === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`
  const deslocamento = (filtros.pagina - 1) * filtros.porPagina

  const [linhas, [totais]] = await Promise.all([
    prisma.$queryRaw<LinhaSql[]>`
      ${testesNumerados}
      SELECT u.id AS aluno_id, u.nome AS aluno_nome, tu.id AS turma_id, tu.nome AS turma_nome,
             e.id AS exercicio_id, e.nome AS exercicio_nome,
             v.data_teste, v.carga_kg, v.origem::text AS origem, a.carga_kg AS carga_anterior
      ${deVigentes}
      ORDER BY ${COLUNAS[filtros.ordenar]} ${direcao} NULLS LAST, u.nome ASC, e.nome ASC
      LIMIT ${filtros.porPagina} OFFSET ${deslocamento}`,
    prisma.$queryRaw<TotaisSql[]>`
      ${testesNumerados}
      SELECT COUNT(*)::int AS registros,
             COUNT(DISTINCT v.usuario_id)::int AS alunos,
             MAX(v.carga_kg) AS maior,
             AVG(v.carga_kg) AS media
      ${deVigentes}`,
  ])

  return {
    resultados: linhas.map((l) => ({
      aluno: { id: l.aluno_id, nome: l.aluno_nome },
      turma: l.turma_id ? { id: l.turma_id, nome: l.turma_nome! } : null,
      exercicio: { id: l.exercicio_id, nome: l.exercicio_nome },
      dataTeste: formatarData(l.data_teste),
      cargaKg: l.carga_kg,
      origem: l.origem,
      variacaoKg: l.carga_anterior === null ? null : arredondar(l.carga_kg - l.carga_anterior),
    })),
    totais: {
      registros: totais.registros,
      alunos: totais.alunos,
      maiorCargaKg: totais.maior,
      // Média só faz sentido comparando o mesmo exercício
      mediaKg: filtros.exercicioId && totais.media !== null ? arredondar(totais.media) : null,
    },
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
    totalPaginas: Math.max(1, Math.ceil(totais.registros / filtros.porPagina)),
  }
}

const arredondar = (valor: number) => Math.round(valor * 10) / 10
