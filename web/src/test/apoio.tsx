import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { vi } from 'vitest'
import type { Usuario } from '../lib/tipos.ts'
import { rotas } from '../rotas.tsx'

type Resposta = { status?: number; body?: unknown }
type Manipulador = (corpo: unknown) => Resposta

/** Simula a API: chaves no formato "GET /api/auth/me". Rotas não mapeadas respondem 404. */
export function simularApi(rotasApi: Record<string, Resposta | Manipulador>) {
  const chamadas: { metodo: string; url: string; corpo: unknown }[] = []
  const fetchFalso = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async (url, init) => {
      const metodo = init?.method ?? 'GET'
      const corpo = init?.body ? JSON.parse(String(init.body)) : undefined
      chamadas.push({ metodo, url, corpo })
      const caminho = url.split('?')[0]
      const definido = rotasApi[`${metodo} ${url}`] ?? rotasApi[`${metodo} ${caminho}`]
      const { status = 200, body } =
        typeof definido === 'function'
          ? definido(corpo)
          : (definido ?? { status: 404, body: { erro: 'Rota não simulada' } })
      return status === 204 ? new Response(null, { status }) : Response.json(body ?? {}, { status })
    },
  )
  vi.stubGlobal('fetch', fetchFalso)
  return chamadas
}

export function renderizar(rotaInicial: string) {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(rotas, { initialEntries: [rotaInicial] })
  render(
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}

export const usuario = (dados: Partial<Usuario> = {}): Usuario => ({
  id: 1,
  nome: 'Ana Souza',
  email: 'ana@teste.com',
  perfil: 'ALUNO',
  turma: null,
  trocarSenha: false,
  consentimentoPendente: false,
  ...dados,
})

export const semSessao = {
  status: 401,
  body: { erro: 'Não autenticado', codigo: 'NAO_AUTENTICADO' },
}
