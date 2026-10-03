import { useQuery } from '@tanstack/react-query'
import { api } from './api.ts'
import type { DetalhePr, ExercicioResumo, ResumoPr } from './tipos.ts'

export const usePrs = () =>
  useQuery({ queryKey: ['prs'], queryFn: () => api<ResumoPr[]>('/me/prs') })

export const useDetalhePr = (exercicioId: number) =>
  useQuery({
    queryKey: ['prs', exercicioId],
    queryFn: () => api<DetalhePr>(`/me/prs/${exercicioId}`),
  })

export const useExerciciosAtivos = () =>
  useQuery({
    queryKey: ['exercicios-ativos'],
    queryFn: () => api<ExercicioResumo[]>('/me/exercicios'),
    staleTime: 10 * 60 * 1000,
  })
