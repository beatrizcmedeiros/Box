import { useQuery } from '@tanstack/react-query'
import { api } from './api.ts'
import type { Exercicio, Turma } from './tipos.ts'

export function useTurmas() {
  return useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/admin/turmas') })
}

export function useExercicios() {
  return useQuery({
    queryKey: ['exercicios'],
    queryFn: () => api<Exercicio[]>('/admin/exercicios'),
  })
}
