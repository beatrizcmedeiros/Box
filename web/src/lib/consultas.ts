import { useQuery } from '@tanstack/react-query'
import { api } from './api.ts'
import type { Turma } from './tipos.ts'

export function useTurmas() {
  return useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>('/admin/turmas') })
}
