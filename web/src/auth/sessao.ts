import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ErroApi } from '../lib/api.ts'
import { limparDadosOffline } from '../lib/pwa.ts'
import type { Usuario } from '../lib/tipos.ts'

export const CHAVE_USUARIO = ['usuario'] as const

type RespostaUsuario = { usuario: Usuario }

/** Usuário logado, ou null se não houver sessão. */
export function useUsuario() {
  return useQuery({
    queryKey: CHAVE_USUARIO,
    queryFn: async () => {
      try {
        return (await api<RespostaUsuario>('/auth/me')).usuario
      } catch (erro) {
        if (erro instanceof ErroApi && erro.status === 401) return null
        throw erro
      }
    },
    staleTime: 5 * 60 * 1000,
  })
}

/** Atualiza o usuário em cache com a resposta das rotas de autenticação. */
function useAtualizarUsuario() {
  const cliente = useQueryClient()
  return ({ usuario }: RespostaUsuario) => cliente.setQueryData(CHAVE_USUARIO, usuario)
}

export function useLogin() {
  const atualizar = useAtualizarUsuario()
  return useMutation({
    mutationFn: (dados: { email: string; senha: string }) =>
      api<RespostaUsuario>('/auth/login', { method: 'POST', body: dados }),
    onSuccess: atualizar,
  })
}

export function useTrocarSenha() {
  const atualizar = useAtualizarUsuario()
  return useMutation({
    mutationFn: (dados: { senhaAtual: string; novaSenha: string }) =>
      api<RespostaUsuario>('/auth/trocar-senha', { method: 'POST', body: dados }),
    onSuccess: atualizar,
  })
}

export function useAceitarTermo() {
  const atualizar = useAtualizarUsuario()
  return useMutation({
    mutationFn: () => api<RespostaUsuario>('/auth/consentimento', { method: 'POST' }),
    onSuccess: atualizar,
  })
}

export function useLogout() {
  const cliente = useQueryClient()

  async function encerrarNoAparelho() {
    // Dados guardados para uso offline não podem ficar para a próxima pessoa do aparelho
    await limparDadosOffline()
    // Grava "sem usuário" (as rotas protegidas redirecionam ao login) e descarta os
    // demais dados em cache. Não usar clear(): ele removeria a própria query do usuário
    // e a tela não seria avisada da saída.
    cliente.setQueryData(CHAVE_USUARIO, null)
    cliente.removeQueries({ predicate: (query) => query.queryKey[0] !== CHAVE_USUARIO[0] })
  }

  return useMutation({
    mutationFn: () => api<void>('/auth/logout', { method: 'POST' }),
    onSuccess: encerrarNoAparelho,
    onError: async (erro) => {
      // Sem conexão a sessão continuaria válida no servidor (o cookie só é apagado por ele):
      // a pessoa precisa saber que ainda não saiu. Outros erros (ex.: sessão já expirada) encerram.
      if (erro instanceof ErroApi && erro.codigo === 'SEM_CONEXAO') return
      await encerrarNoAparelho()
    },
  })
}

/** Rota inicial de cada perfil. */
export const rotaInicial = (usuario: Usuario) =>
  usuario.perfil === 'TREINADOR' ? '/treinador/alunos' : '/aluno'
