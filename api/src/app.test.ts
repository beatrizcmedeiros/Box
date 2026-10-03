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
})

describe('rotas inexistentes', () => {
  it('responde 404 em JSON', async () => {
    const app = criarApp({ verificarBanco: async () => true, webOrigin })
    const res = await request(app).get('/api/nao-existe')

    expect(res.status).toBe(404)
    expect(res.body).toEqual({ erro: 'Rota não encontrada' })
  })
})
