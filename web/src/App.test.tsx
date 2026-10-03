import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App.tsx'

function simularApi(resposta: Promise<Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => resposta),
  )
}

describe('App', () => {
  it('mostra a marca', () => {
    simularApi(new Promise(() => {}))
    render(<App />)
    expect(screen.getByRole('heading', { name: 'PR Box' })).toBeInTheDocument()
  })

  it('mostra que a API e o banco estão funcionando', async () => {
    simularApi(Promise.resolve(Response.json({ status: 'ok' })))
    render(<App />)
    expect(await screen.findByText('API e banco de dados funcionando')).toBeInTheDocument()
  })

  it('mostra quando a API está fora do ar', async () => {
    simularApi(Promise.reject(new Error('sem conexão')))
    render(<App />)
    expect(await screen.findByText('API fora do ar')).toBeInTheDocument()
  })
})
