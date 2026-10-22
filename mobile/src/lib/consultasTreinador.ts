import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from './api'
import type {
  Aluno,
  AlunoParaLancar,
  ConsultaCargas,
  ConsultaPercentuais,
  EvolucaoTurmas,
  Exercicio,
  Importacao,
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

export const useTurmas = () =>
  useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/admin/turmas') })

export const useExercicios = () =>
  useQuery({ queryKey: ['exercicios'], queryFn: () => api<Exercicio[]>('/admin/exercicios') })

export const useVisaoGeral = () =>
  useQuery({
    queryKey: ['visao-geral'],
    queryFn: () => api<VisaoGeral>('/admin/visao-geral'),
    refetchInterval: ATUALIZAR_A_CADA,
  })

export const useAlunos = (filtros: { busca?: string; turmaId?: number | null }) => {
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['alunos', consulta],
    queryFn: () => api<Aluno[]>(`/admin/alunos?${consulta}`),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useAlunosParaLancar = (filtros: {
  data: string
  exercicioId: number | null
  turmaId?: number | null
  busca?: string
}) => {
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['lancamentos', consulta],
    queryFn: () => api<{ alunos: AlunoParaLancar[] }>(`/admin/lancamentos?${consulta}`),
    enabled: !!filtros.exercicioId,
    placeholderData: keepPreviousData,
  })
}

export const usePercentuaisAlunos = (filtros: {
  busca?: string
  exercicioId?: number | null
  turmaId?: number | null
}) => {
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['percentuais', consulta],
    queryFn: () => api<ConsultaPercentuais>(`/admin/percentuais?${consulta}`),
    enabled: !!(filtros.busca || filtros.exercicioId || filtros.turmaId),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useConsultaCargas = (filtros: {
  busca?: string
  exercicioId?: number | null
  turmaId?: number | null
  ordenar: string
  direcao: 'asc' | 'desc'
  pagina: number
}) => {
  const consulta = parametros({ ...filtros, porPagina: 30 })
  return useQuery({
    queryKey: ['cargas', consulta],
    queryFn: () => api<ConsultaCargas>(`/admin/cargas?${consulta}`),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useEvolucaoTurmas = (filtros: { exercicioId?: number | null }) => {
  const consulta = parametros(filtros)
  return useQuery({
    queryKey: ['evolucao', consulta],
    queryFn: () => api<EvolucaoTurmas>(`/admin/evolucao?${consulta}`),
    placeholderData: keepPreviousData,
    refetchInterval: ATUALIZAR_A_CADA,
  })
}

export const useImportacoes = () =>
  useQuery({ queryKey: ['importacoes'], queryFn: () => api<Importacao[]>('/admin/importacoes') })
