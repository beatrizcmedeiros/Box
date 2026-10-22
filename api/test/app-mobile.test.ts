import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import {
  cookiesDe,
  criarAppDeTeste,
  criarUsuario,
  limparBanco,
  logar,
  logarComoTreinador,
  SENHA,
} from './apoio.ts'

const app = criarAppDeTeste()
const APP = { 'X-Prbox-Cliente': 'app' }

beforeEach(limparBanco)

type Tokens = { acesso: string; refresh: string; acessoExpiraEm: string }

async function logarNoApp(email = 'ana@teste.com', senha = SENHA) {
  const res = await request(app).post('/api/auth/login').set(APP).send({ email, senha })
  expect(res.status).toBe(200)
  return res.body.tokens as Tokens
}

describe('login pelo app Android', () => {
  it('devolve os tokens no corpo e não grava cookies', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const res = await request(app)
      .post('/api/auth/login')
      .set(APP)
      .send({ email: 'ana@teste.com', senha: SENHA })

    expect(res.status).toBe(200)
    expect(res.body.usuario.email).toBe('ana@teste.com')
    expect(res.body.tokens).toEqual({
      acesso: expect.any(String),
      refresh: expect.any(String),
      acessoExpiraEm: expect.any(String),
    })
    expect(cookiesDe(res)).toHaveLength(0)
  })

  it('a web continua recebendo cookies e nenhum token no corpo', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@teste.com', senha: SENHA })

    expect(res.body.tokens).toBeUndefined()
    expect(cookiesDe(res).some((c) => c.startsWith('prbox_refresh='))).toBe(true)
  })

  it('acessa as rotas protegidas com Authorization: Bearer', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const { acesso } = await logarNoApp()

    const res = await request(app).get('/api/me/prs').set('Authorization', `Bearer ${acesso}`)
    expect(res.status).toBe(200)

    const invalido = await request(app).get('/api/me/prs').set('Authorization', 'Bearer xyz')
    expect(invalido.status).toBe(401)
  })
})

describe('refresh e logout pelo app', () => {
  it('renova com o refresh token do corpo e rotaciona: o antigo deixa de valer', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const { refresh } = await logarNoApp()

    const renovado = await request(app)
      .post('/api/auth/refresh')
      .set(APP)
      .send({ refreshToken: refresh })
    expect(renovado.status).toBe(200)
    expect(renovado.body.tokens.refresh).not.toBe(refresh)

    const reutilizado = await request(app)
      .post('/api/auth/refresh')
      .set(APP)
      .send({ refreshToken: refresh })
    expect(reutilizado.status).toBe(401)
  })

  it('sem o cabeçalho do app, o refresh token do corpo é ignorado', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const { refresh } = await logarNoApp()

    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: refresh })
    expect(res.status).toBe(401)
  })

  it('logout revoga a sessão do app', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const { refresh } = await logarNoApp()

    await request(app).post('/api/auth/logout').set(APP).send({ refreshToken: refresh })
    const res = await request(app)
      .post('/api/auth/refresh')
      .set(APP)
      .send({ refreshToken: refresh })
    expect(res.status).toBe(401)
  })

  it('trocar a senha devolve tokens novos ao app', async () => {
    await criarUsuario({ email: 'ana@teste.com', trocarSenha: true })
    const { acesso } = await logarNoApp()

    const res = await request(app)
      .post('/api/auth/trocar-senha')
      .set(APP)
      .set('Authorization', `Bearer ${acesso}`)
      .send({ senhaAtual: SENHA, novaSenha: 'nova-senha-123' })

    expect(res.status).toBe(200)
    expect(res.body.usuario.trocarSenha).toBe(false)
    expect(res.body.tokens.refresh).toEqual(expect.any(String))
  })
})

describe('POST /api/auth/excluir-conta', () => {
  it('o aluno exclui a própria conta e todos os seus dados', async () => {
    const ana = await criarUsuario({ email: 'ana@teste.com' })
    const exercicio = await prisma.exercicio.create({ data: { nome: 'Back Squat' } })
    const { acesso } = await logarNoApp()
    const bearer = { Authorization: `Bearer ${acesso}` }
    await request(app)
      .post('/api/me/prs')
      .set(bearer)
      .send({ exercicioId: exercicio.id, dataTeste: '2026-03-15', cargaKg: 100 })

    const res = await request(app)
      .post('/api/auth/excluir-conta')
      .set(bearer)
      .send({ senha: SENHA })

    expect(res.status).toBe(204)
    expect(await prisma.usuario.findUnique({ where: { id: ana.id } })).toBeNull()
    expect(await prisma.testeCarga.count({ where: { usuarioId: ana.id } })).toBe(0)
    expect(await prisma.sessao.count({ where: { usuarioId: ana.id } })).toBe(0)
    expect((await request(app).get('/api/auth/me').set(bearer)).status).toBe(401)
  })

  it('exige a senha correta', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const agente = await logar(app, 'ana@teste.com')

    const res = await agente.post('/api/auth/excluir-conta').send({ senha: 'errada' })

    expect(res.status).toBe(400)
    expect(res.body.codigo).toBe('SENHA_INCORRETA')
    expect(await prisma.usuario.count()).toBe(1)
  })

  it('não permite que o treinador exclua a própria conta pelo app', async () => {
    const treinador = await logarComoTreinador(app)
    const res = await treinador.post('/api/auth/excluir-conta').send({ senha: SENHA })
    expect(res.status).toBe(403)
  })
})
