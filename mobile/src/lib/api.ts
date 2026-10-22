import * as SecureStore from 'expo-secure-store'
import type { RespostaSessao, Tokens } from './tipos'

/**
 * Endereço da API. Em produção é o domínio da web (a Vercel encaminha /api para o Render),
 * definido no eas.json. Em desenvolvimento, vem do arquivo .env.
 */
export const URL_API = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3333/api').replace(
  /\/+$/,
  '',
)

// Só o refresh token fica salvo (no Keystore do Android). O access token dura 15 min e fica em memória.
const CHAVE_REFRESH = 'prbox.refresh'

export type CampoInvalido = { campo: string; mensagem: string }

export class ErroApi extends Error {
  readonly status: number
  readonly codigo?: string
  readonly campos: CampoInvalido[]

  constructor(status: number, mensagem: string, codigo?: string, campos: CampoInvalido[] = []) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
    this.campos = campos
  }

  /** Mensagem do campo informado, se a API apontou erro nele. */
  doCampo(campo: string): string | undefined {
    return this.campos.find((c) => c.campo === campo)?.mensagem
  }
}

const semConexao = () =>
  new ErroApi(0, 'Sem conexão com a internet. Tente de novo quando o sinal voltar.', 'SEM_CONEXAO')

let tokens: Tokens | null = null
let aoPerderSessao: (() => void) | null = null

/** Chamado quando a sessão expira de vez (refresh recusado): o app volta para o login. */
export function definirAoPerderSessao(callback: () => void) {
  aoPerderSessao = callback
}

export async function guardarTokens(novos: Tokens) {
  tokens = novos
  await SecureStore.setItemAsync(CHAVE_REFRESH, novos.refresh)
}

export async function apagarTokens() {
  tokens = null
  await SecureStore.deleteItemAsync(CHAVE_REFRESH)
}

export const refreshAtual = async () =>
  tokens?.refresh ?? (await SecureStore.getItemAsync(CHAVE_REFRESH))

async function requisitar(caminho: string, method: string, body?: unknown, acesso?: string) {
  try {
    return await fetch(`${URL_API}${caminho}`, {
      method,
      headers: {
        'X-Prbox-Cliente': 'app',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(acesso && { Authorization: `Bearer ${acesso}` }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw semConexao()
  }
}

async function lerResposta<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T
  const dados = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new ErroApi(
      res.status,
      dados.erro ?? 'Não foi possível concluir a operação',
      dados.codigo,
      dados.campos,
    )
  }
  return dados as T
}

// Várias requisições podem precisar renovar ao mesmo tempo; todas aguardam a mesma renovação
let renovacaoEmAndamento: Promise<RespostaSessao | null> | null = null

/**
 * Troca o refresh token salvo por tokens novos (o servidor rotaciona o refresh a cada uso).
 * Devolve null se não há sessão ou ela expirou; lança SEM_CONEXAO se não há internet.
 */
export function renovarSessao(): Promise<RespostaSessao | null> {
  renovacaoEmAndamento ??= (async () => {
    const refresh = await refreshAtual()
    if (!refresh) return null
    const res = await requisitar('/auth/refresh', 'POST', { refreshToken: refresh })
    if (res.status === 401) {
      await apagarTokens()
      return null
    }
    const sessao = await lerResposta<RespostaSessao>(res)
    await guardarTokens(sessao.tokens)
    return sessao
  })().finally(() => {
    renovacaoEmAndamento = null
  })
  return renovacaoEmAndamento
}

const expirando = (t: Tokens) => Date.parse(t.acessoExpiraEm) - Date.now() < 30_000

const ROTAS_SEM_RENOVACAO = ['/auth/login', '/auth/refresh', '/auth/logout']

type Opcoes = { method?: string; body?: unknown }

/** Chama a API; renova o token de acesso quando expira e tenta de novo uma vez. */
export async function api<T>(caminho: string, { method = 'GET', body }: Opcoes = {}): Promise<T> {
  const podeRenovar = !ROTAS_SEM_RENOVACAO.includes(caminho)
  // Ao reabrir o app só o refresh token existe (o de acesso fica na memória): renova antes
  if (podeRenovar && (!tokens || expirando(tokens))) await renovarSessao()

  let res = await requisitar(caminho, method, body, tokens?.acesso)

  if (res.status === 401 && podeRenovar) {
    const sessao = await renovarSessao()
    if (!sessao) {
      aoPerderSessao?.()
      throw new ErroApi(401, 'Sua sessão expirou. Entre novamente.', 'SESSAO_EXPIRADA')
    }
    res = await requisitar(caminho, method, body, tokens?.acesso)
  }

  return lerResposta<T>(res)
}
