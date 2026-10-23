import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api, gestao } from './api'
import { useIdContexto } from './contexto'
import type {
  Aluno,
  AlunoParaLancar,
  ConsultaCargas,
  ConsultaPercentuais,
  EvolucaoTurmas,
  Exercicio,
  Importacao,
  Local,
  Turma,
  VisaoGeral,
} from './tipos'

// Outros treinadores (ou os alunos) podem mudar estes dados em outro aparelho
const ATUALIZAR_A_CADA = 30_000

/** Monta a query string sem os filtros vazios. */
export function parametros(filtros: Record<string, string | number | null | undefined>) {
  const p = new URLSearchParams()
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== null && valor !== undefined && valor !== '') p.set(chave, String(valor))
  }
  return p.toString()
}

/** Espera a pessoa parar de digitar antes de pesquisar. */
export function useAtrasado<T>(valor: T, ms = 350) {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), ms)
    return () => clearTimeout(espera)
  }, [valor, ms])
  return atrasado
}

// As chaves levam o contexto: o cache (inclusive o salvo no aparelho) nunca mistura academias

export const useTurmas = () => {
  const ctx = useIdContexto()
  return useQuery({ queryKey: ['turmas', ctx], queryFn: () => api<Turma[]>(gestao('/turmas')) })
}

export const useLocais = () => {
  const ctx = useIdContexto()
  return useQuery({ queryKey: ['locais', ctx], queryFn: () => api<Local[]>(gestao('/locais')) })
}

export const useExercicios = () => {
  const ctx = useIdContexto()
  return useQuery({
    queryKey: ['exercicios', ctx],
    queryFn: () => api<Exercicio[]>(gestao('/exercicios')),
  })
}

export const useVisaoGeral = () => {
  const ctx = useIdContexto()
  return useQuery({
    queryKey: ['visao-geral', ctx],
    queryFn: () => api<VisaoGeral>(gestao('/visao-geral')),
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

type FiltroGrupo = { turmaId?: number | null; localId?: number | null }

export const useAlunos = (filtros: { busca?: string } & FiltroGrupo) => {
  const ctx = useIdContexto()
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['alunos', ctx, consulta],
    queryFn: () => api<Aluno[]>(gestao(`/alunos?${consulta}`)),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useAlunosParaLancar = (
  filtros: { data: string; exercicioId: number | null; busca?: string } & FiltroGrupo,
) => {
  const ctx = useIdContexto()
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['lancamentos', ctx, consulta],
    queryFn: () => api<{ alunos: AlunoParaLancar[] }>(gestao(`/lancamentos?${consulta}`)),
    enabled: !!filtros.exercicioId,
    placeholderData: keepPreviousData,
  })
}

export const usePercentuaisAlunos = (
  filtros: { busca?: string; exercicioId?: number | null; base?: 'ultimo' | 'maior' } & FiltroGrupo,
) => {
  const ctx = useIdContexto()
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['percentuais', ctx, consulta],
    queryFn: () => api<ConsultaPercentuais>(gestao(`/percentuais?${consulta}`)),
    enabled: !!(filtros.busca || filtros.exercicioId || filtros.turmaId || filtros.localId),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useConsultaCargas = (
  filtros: {
    busca?: string
    exercicioId?: number | null
    ordenar: string
    direcao: 'asc' | 'desc'
    pagina: number
  } & FiltroGrupo,
) => {
  const ctx = useIdContexto()
  const consulta = parametros({ ...filtros, porPagina: 30 })
  return useQuery({
    queryKey: ['cargas', ctx, consulta],
    queryFn: () => api<ConsultaCargas>(gestao(`/cargas?${consulta}`)),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useEvolucaoTurmas = (filtros: { exercicioId?: number | null }) => {
  const ctx = useIdContexto()
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['evolucao', ctx, consulta],
    queryFn: () => api<EvolucaoTurmas>(gestao(`/evolucao?${consulta}`)),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useImportacoes = () => {
  const ctx = useIdContexto()
  return useQuery({
    queryKey: ['importacoes', ctx],
    queryFn: () => api<Importacao[]>(gestao('/importacoes')),
  })
}
