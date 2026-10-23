import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderizar, semSessao, simularApi } from '../test/apoio.tsx'

describe('páginas públicas exigidas pela Google Play', () => {
  it('a política de privacidade abre sem login', async () => {
    simularApi({ 'GET /api/auth/me': semSessao, 'POST /api/auth/refresh': semSessao })
    renderizar('/privacidade')

    expect(await screen.findByText('Política de privacidade')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Dados coletados' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Quem vê os seus dados' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'excluir a sua conta' })).toHaveAttribute(
      'href',
      '/excluir-conta',
    )
  })

  it('as instruções de exclusão de conta abrem sem login', async () => {
    simularApi({ 'GET /api/auth/me': semSessao, 'POST /api/auth/refresh': semSessao })
    renderizar('/excluir-conta')

    expect(await screen.findByText('Excluir a sua conta e os seus dados')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'O que é apagado' })).toBeInTheDocument()
  })
})
