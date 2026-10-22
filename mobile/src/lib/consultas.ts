import { useQuery } from '@tanstack/react-query'
import { api } from './api'
import type { DetalhePr, ExercicioResumo, ResumoPr, SerieExercicio } from './tipos'

/**
 * Telas que mostram dados que outra pessoa pode mudar (o treinador lança o teste do aluno)
 * buscam de novo a cada 30 s enquanto estão abertas, além de ao voltar para o app.
 */
const ATUALIZAR_A_CADA = 30_000

export const usePrs = () =>
  useQuery({
    queryKey: ['prs'],
    queryFn: () => api<ResumoPr[]>('/me/prs'),
    refetchInterval: ATUALIZAR_A_CADA,
  })

export const useDetalhePr = (exercicioId: number) =>
  useQuery({
    queryKey: ['prs', exercicioId],
    queryFn: () => api<DetalhePr>(`/me/prs/${exercicioId}`),
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
    queryFn: () => api<ExercicioResumo[]>('/me/exercicios'),
    staleTime: 10 * 60 * 1000,
  })
