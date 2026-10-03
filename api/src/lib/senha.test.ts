import { describe, expect, it } from 'vitest'
import { gerarHashSenha, gerarSenhaTemporaria, verificarSenha } from './senha.ts'

describe('hash de senha', () => {
  it('aceita a senha correta e recusa a incorreta', async () => {
    const hash = await gerarHashSenha('minha-senha-123')
    expect(await verificarSenha('minha-senha-123', hash)).toBe(true)
    expect(await verificarSenha('outra-senha', hash)).toBe(false)
  })

  it('usa sal aleatório (mesma senha gera hashes diferentes)', async () => {
    const [a, b] = await Promise.all([gerarHashSenha('igual'), gerarHashSenha('igual')])
    expect(a).not.toBe(b)
    expect(a.startsWith('scrypt$')).toBe(true)
  })

  it('recusa hash em formato desconhecido', async () => {
    expect(await verificarSenha('qualquer', 'formato-invalido')).toBe(false)
  })
})

describe('senha temporária', () => {
  it('tem 10 caracteres sem símbolos ambíguos', () => {
    for (let i = 0; i < 50; i++) {
      const senha = gerarSenhaTemporaria()
      expect(senha).toHaveLength(10)
      expect(senha).not.toMatch(/[0O1lI]/)
    }
  })
})
