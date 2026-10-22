import { useQuery } from '@tanstack/react-query'
import { api, gestao } from './api.ts'
import type { Exercicio, Local, Turma } from './tipos.ts'

export function useTurmas() {
  return useQuery({ queryKey: ['turmas'], queryFn: () => api<Turma[]>(gestao('/turmas')) })
}

export function useExercicios() {
  return useQuery({
    queryKey: ['exercicios'],
    queryFn: () => api<Exercicio[]>(gestao('/exercicios')),
  })
}

/** Locais do professor (só existem em "Meus alunos"; na academia a lista vem vazia). */
export function useLocais() {
  return useQuery({ queryKey: ['locais'], queryFn: () => api<Local[]>(gestao('/locais')) })
}
