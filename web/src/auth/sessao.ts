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

export type DadosCadastro = {
  nome: string
  email: string
  senha: string
  tipo: 'PESSOA' | 'ACADEMIA'
  ehProfessor: boolean
}

/** Cria a conta e já entra; o próximo passo é aceitar o termo. */
export function useCadastro() {
  const atualizar = useAtualizarUsuario()
  return useMutation({
    mutationFn: (dados: DadosCadastro) =>
      api<RespostaUsuario>('/auth/cadastro', { method: 'POST', body: dados }),
    onSuccess: atualizar,
  })
}

export function useEsqueciSenha() {
  return useMutation({
    mutationFn: (email: string) =>
      api<void>('/auth/esqueci-senha', { method: 'POST', body: { email } }),
  })
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (dados: { email: string; codigo: string; novaSenha: string }) =>
      api<void>('/auth/redefinir-senha', { method: 'POST', body: dados }),
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

/** Pode usar a área de gestão (alunos, turmas, teste de carga...): academia ou professor. */
export const fazGestao = (usuario: Usuario) => usuario.tipo === 'ACADEMIA' || usuario.ehProfessor

/** Rota inicial: professores e academias começam na gestão; os demais, nos próprios PRs. */
export const rotaInicial = (usuario: Usuario) =>
  fazGestao(usuario) ? '/treinador/visao-geral' : '/aluno'

/** Liga ou desliga a área do professor na conta da pessoa. */
export function useSouProfessor() {
  const atualizar = useAtualizarUsuario()
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (ativo: boolean) =>
      api<RespostaUsuario>('/professor/perfil', { method: 'PUT', body: { ativo } }),
    onSuccess: (resposta) => {
      atualizar(resposta)
      cliente.invalidateQueries({ queryKey: ['contextos'] })
    },
  })
}

/** Exclusão definitiva da própria conta. */
export function useExcluirConta() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (senha: string) =>
      api<void>('/auth/excluir-conta', { method: 'POST', body: { senha } }),
    onSuccess: async () => {
      await limparDadosOffline()
      cliente.setQueryData(CHAVE_USUARIO, null)
      cliente.removeQueries({ predicate: (query) => query.queryKey[0] !== CHAVE_USUARIO[0] })
    },
  })
}
