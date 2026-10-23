import { useQuery } from '@tanstack/react-query'
import { api } from './api.ts'
import type { BasePr } from './basePr.ts'
import type { DetalhePr, ExercicioDoAluno, ResumoPr } from './tipos.ts'

/** PR de cada exercício: o último teste (padrão) ou o maior PR, conforme a base. */
export const usePrs = (base: BasePr = 'ultimo') =>
  useQuery({ queryKey: ['prs', base], queryFn: () => api<ResumoPr[]>(`/me/prs?base=${base}`) })

export const useDetalhePr = (exercicioId: number, base: BasePr = 'ultimo') =>
  useQuery({
    queryKey: ['prs', exercicioId, base],
    queryFn: () => api<DetalhePr>(`/me/prs/${exercicioId}?base=${base}`),
  })

export const useExerciciosAtivos = () =>
  useQuery({
    queryKey: ['exercicios-ativos'],
    queryFn: () => api<ExercicioDoAluno[]>('/me/exercicios'),
    staleTime: 10 * 60 * 1000,
  })
