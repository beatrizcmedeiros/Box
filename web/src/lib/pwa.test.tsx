import { act, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderizar, simularApi, usuario } from '../test/apoio.tsx'
import { api, ErroApi } from './api.ts'
import { useDadosSalvosEm } from './estadoConexao.ts'

describe('sem conexão', () => {
  it('falha de rede vira ErroApi com mensagem em português', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch'))),
    )

    const erro = (await api('/me/prs').catch((e) => e)) as ErroApi
    expect(erro).toBeInstanceOf(ErroApi)
    expect(erro.codigo).toBe('SEM_CONEXAO')
    expect(erro.message).toContain('Sem conexão com a internet')
  })

  it('marca quando os dados vieram do cache do service worker e limpa com resposta nova', async () => {
    const { result } = renderHook(() => useDadosSalvosEm())
    const resposta = (offline: boolean) =>
      Response.json([], {
        headers: offline
          ? { 'x-prbox-offline': '1', date: 'Mon, 05 Oct 2026 18:20:22 GMT' }
          : { date: 'Mon, 05 Oct 2026 19:00:00 GMT' },
      })

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => resposta(true)),
    )
    await act(() => api('/me/prs'))
    expect(result.current).toBe('Mon, 05 Oct 2026 18:20:22 GMT')

    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(async () => resposta(false)),
    )
    await act(() => api('/me/prs'))
    expect(result.current).toBeNull()
  })

  it('não sai da conta sem conexão (o servidor ainda não encerrou a sessão)', async () => {
    simularApi({
      'GET /api/auth/me': { body: { usuario: usuario() } },
      'GET /api/me/prs': { body: [] },
    })
    const router = renderizar('/aluno/perfil')
    const pessoa = userEvent.setup()
    await screen.findByText('App no celular')

    // A partir daqui, a rede cai
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() => Promise.reject(new TypeError('Failed to fetch'))),
    )
    await pessoa.click(screen.getByRole('button', { name: 'Sair' }))

    expect(await screen.findByText(/para sair da conta, conecte-se à internet/)).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/aluno/perfil')
  })
})
