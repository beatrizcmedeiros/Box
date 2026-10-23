import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Campo } from './ui.tsx'

describe('campo de senha', () => {
  it('o olhinho mostra e oculta o que foi digitado', async () => {
    const pessoa = userEvent.setup()
    render(<Campo rotulo="Senha" type="password" defaultValue="segredo-1" />)

    const campo = screen.getByLabelText('Senha')
    expect(campo).toHaveAttribute('type', 'password')

    await pessoa.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(campo).toHaveAttribute('type', 'text')

    await pessoa.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(campo).toHaveAttribute('type', 'password')
  })

  it('campos que não são de senha não têm o olhinho', () => {
    render(<Campo rotulo="E-mail" type="email" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
