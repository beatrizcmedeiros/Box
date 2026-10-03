import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { cookiesDe, criarAppDeTeste, criarUsuario, limparBanco, logar, SENHA } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(limparBanco)

describe('POST /api/auth/login', () => {
  it('autentica e grava os cookies httpOnly de acesso e de refresh', async () => {
    await criarUsuario({ nome: 'Ana Souza', email: 'ana@teste.com' })

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: '  ANA@teste.com ', senha: SENHA })

    expect(res.status).toBe(200)
    expect(res.body.usuario).toMatchObject({
      nome: 'Ana Souza',
      email: 'ana@teste.com',
      perfil: 'ALUNO',
    })
    expect(res.body.usuario).not.toHaveProperty('senhaHash')

    const cookies = cookiesDe(res)
    expect(cookies.find((c) => c.startsWith('prbox_acesso='))).toMatch(/HttpOnly/)
    expect(cookies.find((c) => c.startsWith('prbox_refresh='))).toMatch(/Path=\/api\/auth/)
  })

  it('recusa senha incorreta e e-mail inexistente com a mesma mensagem', async () => {
    await criarUsuario({ email: 'ana@teste.com' })

    const senhaErrada = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@teste.com', senha: 'errada' })
    const emailInexistente = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ninguem@teste.com', senha: SENHA })

    for (const res of [senhaErrada, emailInexistente]) {
      expect(res.status).toBe(401)
      expect(res.body).toMatchObject({
        erro: 'E-mail ou senha incorretos',
        codigo: 'CREDENCIAIS_INVALIDAS',
      })
    }
  })

  it('recusa usuário desativado', async () => {
    await criarUsuario({ email: 'inativo@teste.com', ativo: false })
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inativo@teste.com', senha: SENHA })
    expect(res.status).toBe(401)
  })

  it('valida os campos', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nao-e-email', senha: '' })
    expect(res.status).toBe(400)
    expect(res.body.campos.map((c: { campo: string }) => c.campo)).toEqual(['email', 'senha'])
  })
})

describe('GET /api/auth/me', () => {
  it('exige autenticação', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
    expect(res.body.codigo).toBe('NAO_AUTENTICADO')
  })

  it('devolve o usuário logado', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const agente = await logar(app, 'ana@teste.com')
    const res = await agente.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body.usuario).toMatchObject({ email: 'ana@teste.com', consentimentoPendente: false })
  })
})

describe('refresh e logout', () => {
  it('rotaciona o refresh token: o token antigo deixa de valer', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ana@teste.com', senha: SENHA })
    const refreshAntigo = cookiesDe(login)
      .find((c) => c.startsWith('prbox_refresh='))!
      .split(';')[0]

    const primeiro = await request(app).post('/api/auth/refresh').set('Cookie', refreshAntigo)
    expect(primeiro.status).toBe(200)

    const reuso = await request(app).post('/api/auth/refresh').set('Cookie', refreshAntigo)
    expect(reuso.status).toBe(401)
    expect(reuso.body.codigo).toBe('SESSAO_EXPIRADA')
  })

  it('logout revoga a sessão', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const agente = await logar(app, 'ana@teste.com')

    expect((await agente.post('/api/auth/logout')).status).toBe(204)
    expect((await agente.get('/api/auth/me')).status).toBe(401)
    expect((await agente.post('/api/auth/refresh')).status).toBe(401)
    expect(await prisma.sessao.count({ where: { revogadaEm: null } })).toBe(0)
  })
})

describe('primeiro acesso', () => {
  it('exige trocar a senha temporária e aceitar o termo antes de usar o sistema', async () => {
    await criarUsuario({
      email: 'treinador@teste.com',
      perfil: 'TREINADOR',
      trocarSenha: true,
      consentido: false,
    })
    const agente = await logar(app, 'treinador@teste.com')

    let res = await agente.get('/api/admin/turmas')
    expect(res.status).toBe(403)
    expect(res.body.codigo).toBe('TROCAR_SENHA')

    res = await agente
      .post('/api/auth/trocar-senha')
      .send({ senhaAtual: 'errada', novaSenha: 'nova-senha-123' })
    expect(res.status).toBe(400)
    expect(res.body.codigo).toBe('SENHA_ATUAL_INCORRETA')

    res = await agente
      .post('/api/auth/trocar-senha')
      .send({ senhaAtual: SENHA, novaSenha: 'curta' })
    expect(res.status).toBe(400)

    res = await agente.post('/api/auth/trocar-senha').send({ senhaAtual: SENHA, novaSenha: SENHA })
    expect(res.body.codigo).toBe('SENHA_REPETIDA')

    res = await agente
      .post('/api/auth/trocar-senha')
      .send({ senhaAtual: SENHA, novaSenha: 'nova-senha-123' })
    expect(res.status).toBe(200)
    expect(res.body.usuario.trocarSenha).toBe(false)

    res = await agente.get('/api/admin/turmas')
    expect(res.status).toBe(403)
    expect(res.body.codigo).toBe('CONSENTIMENTO_PENDENTE')

    res = await agente.post('/api/auth/consentimento')
    expect(res.body.usuario.consentimentoPendente).toBe(false)

    expect((await agente.get('/api/admin/turmas')).status).toBe(200)
  })

  it('trocar a senha encerra as sessões de outros dispositivos', async () => {
    await criarUsuario({ email: 'ana@teste.com' })
    const celular = await logar(app, 'ana@teste.com')
    const computador = await logar(app, 'ana@teste.com')

    await celular
      .post('/api/auth/trocar-senha')
      .send({ senhaAtual: SENHA, novaSenha: 'nova-senha-123' })

    expect((await computador.post('/api/auth/refresh')).status).toBe(401)
    expect((await celular.post('/api/auth/refresh')).status).toBe(200)
  })
})
