import type { BasePr } from './basePr'
import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { DetalhePr, ExercicioDoAluno, ResumoPr, SerieExercicio } from './tipos'

/**
 * Telas que mostram dados que outra pessoa pode mudar (o treinador lança o teste do aluno)
 * buscam de novo a cada 30 s enquanto estão abertas, além de ao voltar para o app.
 */
const ATUALIZAR_A_CADA = 30_000

/** PR de cada exercício: o último teste (padrão) ou o maior PR, conforme a base. */
export const usePrs = (base: BasePr = 'ultimo') =>
  useQuery({
    queryKey: ['prs', base],
    queryFn: () => api<ResumoPr[]>(`/me/prs?base=${base}`),
    refetchInterval: ATUALIZAR_A_CADA,
  })

export const useDetalhePr = (exercicioId: number, base: BasePr = 'ultimo') =>
  useQuery({
    queryKey: ['prs', exercicioId, base],
    queryFn: () => api<DetalhePr>(`/me/prs/${exercicioId}?base=${base}`),
    refetchInterval: ATUALIZAR_A_CADA,
  })

export const useEvolucao = () =>
  useQuery({
    queryKey: ['prs', 'evolucao'],
    queryFn: () => api<{ exercicios: SerieExercicio[] }>('/me/evolucao'),
    refetchInterval: ATUALIZAR_A_CADA,
  })

export const useExerciciosAtivos = () =>
  useQuery({
    queryKey: ['exercicios-ativos'],
    queryFn: () => api<ExercicioDoAluno[]>('/me/exercicios'),
    staleTime: 10 * 60 * 1000,
  })
