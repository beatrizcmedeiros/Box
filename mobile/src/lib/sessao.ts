import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, apagarTokens, ErroApi, guardarTokens, refreshAtual, renovarSessao } from './api'
import { apagarCacheOffline } from './cacheOffline'
import type { RespostaSessao, Usuario } from './tipos'

export const CHAVE_USUARIO = ['usuario'] as const

/**
 * Usuário logado, ou null se não houver sessão.
 * Ao abrir o app, usa o refresh token guardado no aparelho para recuperar a sessão.
 */
export function useUsuario() {
  const cliente = useQueryClient()
  return useQuery({
    queryKey: CHAVE_USUARIO,
    queryFn: async (): Promise<Usuario | null> => {
      try {
        const sessao = await renovarSessao()
        return sessao?.usuario ?? null
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 401) return null
        // Sem internet: continua com o usuário salvo no aparelho (modo offline)
        const salvo = cliente.getQueryData<Usuario | null>(CHAVE_USUARIO)
        if (erro instanceof ErroApi && erro.codigo === 'SEM_CONEXAO' && salvo) return salvo
        throw erro
      }
    },
    // A sessão é renovada pelas próprias requisições; não precisa ser buscada de novo sozinha
    staleTime: Infinity,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  })
}

/** Grava os tokens recebidos e atualiza o usuário em cache. */
function useAplicarSessao() {
  const cliente = useQueryClient()
  return async ({ usuario, tokens }: RespostaSessao) => {
    await guardarTokens(tokens)
    cliente.setQueryData(CHAVE_USUARIO, usuario)
  }
}

export function useLogin() {
  const aplicar = useAplicarSessao()
  return useMutation({
    mutationFn: (dados: { email: string; senha: string }) =>
      api<RespostaSessao>('/auth/login', { method: 'POST', body: dados }),
    onSuccess: aplicar,
  })
}

export type DadosCadastro = {
  nome: string
  email: string
  senha: string
  tipo: 'PESSOA' | 'ACADEMIA'
  ehProfessor: boolean
}

/** Cria a conta e já entra; o próximo passo é aceitar o termo. */
export function useCadastro() {
  const aplicar = useAplicarSessao()
  return useMutation({
    mutationFn: (dados: DadosCadastro) =>
      api<RespostaSessao>('/auth/cadastro', { method: 'POST', body: dados }),
    onSuccess: (resposta) => aplicar(resposta),
  })
}

export const useEsqueciSenha = () =>
  useMutation({
    mutationFn: (email: string) =>
      api<void>('/auth/esqueci-senha', { method: 'POST', body: { email } }),
  })

export const useRedefinirSenha = () =>
  useMutation({
    mutationFn: (dados: { email: string; codigo: string; novaSenha: string }) =>
      api<void>('/auth/redefinir-senha', { method: 'POST', body: dados }),
  })

/** Liga ou desliga a área do professor na conta da pessoa. */
/** Pode usar a área de gestão: academia ou professor. */
export const fazGestao = (u: Usuario) => u.tipo === 'ACADEMIA' || u.ehProfessor

export function useTrocarSenha() {
  const aplicar = useAplicarSessao()
  return useMutation({
    mutationFn: (dados: { senhaAtual: string; novaSenha: string }) =>
      api<RespostaSessao>('/auth/trocar-senha', { method: 'POST', body: dados }),
    onSuccess: aplicar,
  })
}

export function useAceitarTermo() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: () => api<{ usuario: Usuario }>('/auth/consentimento', { method: 'POST' }),
    onSuccess: ({ usuario }) => cliente.setQueryData(CHAVE_USUARIO, usuario),
  })
}

/** Apaga do aparelho tudo o que pertence ao usuário que está saindo. */
export function useEncerrarNoAparelho() {
  const cliente = useQueryClient()
  return async () => {
    await apagarTokens()
    await apagarCacheOffline()
    // Não usar clear(): removeria a query do usuário e as telas não seriam avisadas da saída
    cliente.setQueryData(CHAVE_USUARIO, null)
    cliente.removeQueries({ predicate: (query) => query.queryKey[0] !== CHAVE_USUARIO[0] })
  }
}

export function useLogout() {
  const encerrar = useEncerrarNoAparelho()
  return useMutation({
    mutationFn: async () =>
      api<void>('/auth/logout', { method: 'POST', body: { refreshToken: await refreshAtual() } }),
    onSuccess: encerrar,
    onError: async (erro) => {
      // Sem conexão a sessão continuaria válida no servidor: a pessoa precisa saber que não saiu
      if (erro instanceof ErroApi && erro.codigo === 'SEM_CONEXAO') return
      await encerrar()
    },
  })
}

/** Exclusão definitiva da conta do aluno (exigência da Google Play). */
export function useExcluirConta() {
  const encerrar = useEncerrarNoAparelho()
  return useMutation({
    mutationFn: (dados: { senha: string }) =>
      api<void>('/auth/excluir-conta', { method: 'POST', body: dados }),
    onSuccess: encerrar,
  })
}
