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

type Opcoes = { method?: string; body?: unknown }

const ROTAS_SEM_RENOVACAO = ['/auth/login', '/auth/refresh', '/auth/logout']

// Várias requisições podem receber 401 ao mesmo tempo; todas aguardam a mesma renovação
let renovacaoEmAndamento: Promise<boolean> | null = null

function renovarSessao(): Promise<boolean> {
  renovacaoEmAndamento ??= fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      renovacaoEmAndamento = null
    })
  return renovacaoEmAndamento
}

async function executar(caminho: string, { method = 'GET', body }: Opcoes) {
  return fetch(`/api${caminho}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

/** Chama a API; se o token de acesso expirou, renova a sessão e tenta de novo uma vez. */
export async function api<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  let res = await executar(caminho, opcoes)

  if (res.status === 401 && !ROTAS_SEM_RENOVACAO.includes(caminho) && (await renovarSessao())) {
    res = await executar(caminho, opcoes)
  }

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
