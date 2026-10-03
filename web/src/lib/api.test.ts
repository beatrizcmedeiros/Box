import { describe, expect, it } from 'vitest'
import { simularApi } from '../test/apoio.tsx'
import { api, ErroApi } from './api.ts'

describe('api', () => {
  it('renova a sessão quando o token de acesso expira e repete a requisição', async () => {
    let tentativas = 0
    const chamadas = simularApi({
      'GET /api/admin/turmas': () =>
        ++tentativas === 1
          ? { status: 401, body: { codigo: 'TOKEN_INVALIDO' } }
          : { body: [{ id: 1 }] },
      'POST /api/auth/refresh': { body: {} },
    })

    expect(await api('/admin/turmas')).toEqual([{ id: 1 }])
    expect(chamadas.map((c) => `${c.metodo} ${c.url}`)).toEqual([
      'GET /api/admin/turmas',
      'POST /api/auth/refresh',
      'GET /api/admin/turmas',
    ])
  })

  it('devolve ErroApi com os campos inválidos', async () => {
    simularApi({
      'POST /api/admin/turmas': {
        status: 400,
        body: { erro: 'Dados inválidos', campos: [{ campo: 'nome', mensagem: 'Informe o nome' }] },
      },
    })

    const erro = (await api('/admin/turmas', { method: 'POST', body: {} }).catch(
      (e) => e,
    )) as ErroApi
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro.doCampo('nome')).toBe('Informe o nome')
  })
})
