import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { criarApp } from './app.ts'

const webOrigin = 'http://localhost:5173'

describe('GET /api/health', () => {
  it('responde 200 quando o banco está disponível', async () => {
    const app = criarApp({ verificarBanco: async () => true, webOrigin })
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ status: 'ok', banco: 'ok' })
  })

  it('responde 503 quando o banco está indisponível', async () => {
    const app = criarApp({ verificarBanco: async () => false, webOrigin })
    const res = await request(app).get('/api/health')

    expect(res.status).toBe(503)
    expect(res.body).toMatchObject({ status: 'degradado', banco: 'indisponivel' })
  })

  it('informa qual serviço envia os e-mails, sem expor a chave', async () => {
    const app = criarApp({ verificarBanco: async () => true, webOrigin })
    const original = { ...process.env }
    try {
      delete process.env.RESEND_API_KEY
      delete process.env.EMAIL_SMTP_USUARIO
      expect((await request(app).get('/api/health')).body.email).toBe('nao_configurado')

      process.env.EMAIL_SMTP_USUARIO = 'box@gmail.com'
      process.env.EMAIL_SMTP_SENHA = 'segredo-de-app'
      const comSmtp = await request(app).get('/api/health')
      expect(comSmtp.body.email).toBe('smtp')
      expect(JSON.stringify(comSmtp.body)).not.toContain('segredo')

      process.env.RESEND_API_KEY = 're_123'
      expect((await request(app).get('/api/health')).body.email).toBe('resend')
    } finally {
      process.env = original
    }
  })
})

describe('rotas inexistentes', () => {
  it('responde 404 em JSON', async () => {
    const app = criarApp({ verificarBanco: async () => true, webOrigin })
    const res = await request(app).get('/api/nao-existe')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ erro: 'Rota não encontrada' })
  })
})
