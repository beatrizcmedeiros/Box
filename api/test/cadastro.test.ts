import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { caixaDeSaida } from '../src/services/email.ts'
import { criarAppDeTeste, criarUsuario, limparBanco, logar } from './apoio.ts'

const app = criarAppDeTeste()

beforeEach(async () => {
  await limparBanco()
  caixaDeSaida.length = 0
})

/** Último código de 6 dígitos enviado ao e-mail. */
function ultimoCodigo(email: string) {
  const enviado = caixaDeSaida.filter((e) => e.para === email).at(-1)
  return enviado?.texto.match(/\b(\d{6})\b/)?.[1]
}

/** Permite pedir outro código sem esperar 1 minuto. */
const liberarReenvio = () =>
  prisma.codigoEmail.updateMany({ data: { criadoEm: new Date(Date.now() - 2 * 60_000) } })

async function cadastrar(dados: Record<string, unknown>) {
  const agente = request.agent(app)
  const res = await agente.post('/api/auth/cadastro').send(dados)
  return { agente, res }
}

describe('POST /api/auth/cadastro', () => {
  it('cria a conta, já entra logado e envia o código de confirmação', async () => {
    const { agente, res } = await cadastrar({
      nome: 'Ana Souza',
      email: 'Ana@Teste.com',
      senha: 'senha-forte-123',
    })

    expect(res.status).toBe(201)
    expect(res.body.usuario).toMatchObject({
      nome: 'Ana Souza',
      email: 'ana@teste.com',
      tipo: 'PESSOA',
      ehProfessor: false,
      emailConfirmado: false,
      consentimentoPendente: true,
    })
    expect(ultimoCodigo('ana@teste.com')).toMatch(/^\d{6}$/)

    // Logado, mas só usa o sistema depois de confirmar o e-mail
    expect((await agente.get('/api/auth/me')).status).toBe(200)
    const bloqueado = await agente.get('/api/me/prs')
    expect(bloqueado.body.codigo).toBe('EMAIL_NAO_CONFIRMADO')
  })

  it('cadastra professor e academia', async () => {
    const professor = await cadastrar({
      nome: 'Carlos',
      email: 'carlos@t.com',
      senha: 'senha-forte-123',
      ehProfessor: true,
    })
    expect(professor.res.body.usuario).toMatchObject({ tipo: 'PESSOA', ehProfessor: true })

    const academia = await cadastrar({
      nome: 'Box Centro',
      email: 'box@t.com',
      senha: 'senha-forte-123',
      tipo: 'ACADEMIA',
      ehProfessor: true,
    })
    expect(academia.res.body.usuario).toMatchObject({
      tipo: 'ACADEMIA',
      ehProfessor: false,
      academia: { id: expect.any(Number), nome: 'Box Centro' },
    })
  })

  it('avisa quando o código não pôde ser enviado (envio de e-mail não configurado)', async () => {
    const anterior = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const { res } = await cadastrar({ nome: 'Ana', email: 'ana@t.com', senha: 'senha-forte-123' })
      expect(res.status).toBe(201)
      expect(res.body.emailEnviado).toBe(false)
    } finally {
      process.env.NODE_ENV = anterior
    }
    // Em desenvolvimento e testes, o código vai para a caixa de saída
    const outro = await cadastrar({ nome: 'Bia', email: 'bia@t.com', senha: 'senha-forte-123' })
    expect(outro.res.body.emailEnviado).toBe(true)
  })

  it('recusa e-mail já cadastrado e senha curta', async () => {
    await criarUsuario({ email: 'ana@teste.com', vinculado: false })
    const repetido = await cadastrar({
      nome: 'Ana',
      email: 'ana@teste.com',
      senha: 'senha-forte-123',
    })
    expect(repetido.res.status).toBe(409)
    expect(repetido.res.body.codigo).toBe('EMAIL_EM_USO')

    const curta = await cadastrar({ nome: 'Bia', email: 'bia@teste.com', senha: 'curta' })
    expect(curta.res.status).toBe(400)
  })
})

describe('confirmação do e-mail', () => {
  it('libera o uso depois do código certo e do termo', async () => {
    const { agente } = await cadastrar({
      nome: 'Ana',
      email: 'ana@t.com',
      senha: 'senha-forte-123',
    })

    const errado = await agente.post('/api/auth/confirmar-email').send({ codigo: '000000' })
    expect(errado.body.codigo).toBe('CODIGO_INVALIDO')

    const certo = await agente
      .post('/api/auth/confirmar-email')
      .send({ codigo: ultimoCodigo('ana@t.com') })
    expect(certo.body.usuario.emailConfirmado).toBe(true)

    await agente.post('/api/auth/consentimento')
    expect((await agente.get('/api/me/prs')).status).toBe(200)
  })

  it('o código vale só 5 tentativas; um código novo invalida o anterior', async () => {
    const { agente } = await cadastrar({
      nome: 'Ana',
      email: 'ana@t.com',
      senha: 'senha-forte-123',
    })
    const primeiro = ultimoCodigo('ana@t.com')!

    for (let i = 0; i < 5; i++) {
      await agente.post('/api/auth/confirmar-email').send({ codigo: '999999' })
    }
    const esgotado = await agente.post('/api/auth/confirmar-email').send({ codigo: primeiro })
    expect(esgotado.body.codigo).toBe('CODIGO_INVALIDO')

    // Reenviar logo em seguida é recusado; depois de 1 minuto, chega um código novo
    expect((await agente.post('/api/auth/reenviar-confirmacao')).body.codigo).toBe(
      'AGUARDE_REENVIO',
    )
    await liberarReenvio()
    expect((await agente.post('/api/auth/reenviar-confirmacao')).status).toBe(204)
    const novo = ultimoCodigo('ana@t.com')!

    const res = await agente.post('/api/auth/confirmar-email').send({ codigo: novo })
    expect(res.body.usuario.emailConfirmado).toBe(true)
  })

  it('código expirado não vale', async () => {
    const { agente } = await cadastrar({
      nome: 'Ana',
      email: 'ana@t.com',
      senha: 'senha-forte-123',
    })
    await prisma.codigoEmail.updateMany({ data: { expiraEm: new Date(Date.now() - 1000) } })
    const res = await agente
      .post('/api/auth/confirmar-email')
      .send({ codigo: ultimoCodigo('ana@t.com') })
    expect(res.body.codigo).toBe('CODIGO_INVALIDO')
  })
})

describe('esqueci a senha', () => {
  it('não revela se o e-mail existe', async () => {
    const res = await request(app).post('/api/auth/esqueci-senha').send({ email: 'ninguem@t.com' })
    expect(res.status).toBe(204)
    expect(caixaDeSaida).toHaveLength(0)

    const semConta = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ email: 'ninguem@t.com', codigo: '123456', novaSenha: 'nova-senha-123' })
    expect(semConta.body.codigo).toBe('CODIGO_INVALIDO')
  })

  it('cria a nova senha com o código e encerra as sessões abertas', async () => {
    await criarUsuario({ email: 'ana@t.com', vinculado: false })
    const sessaoAntiga = await logar(app, 'ana@t.com')

    expect(
      (await request(app).post('/api/auth/esqueci-senha').send({ email: 'ana@t.com' })).status,
    ).toBe(204)
    const codigo = ultimoCodigo('ana@t.com')!

    const errado = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ email: 'ana@t.com', codigo: '000000', novaSenha: 'nova-senha-123' })
    expect(errado.body.codigo).toBe('CODIGO_INVALIDO')

    const certo = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ email: 'ana@t.com', codigo, novaSenha: 'nova-senha-123' })
    expect(certo.status).toBe(204)

    expect((await sessaoAntiga.post('/api/auth/refresh')).status).toBe(401)
    await expect(logar(app, 'ana@t.com')).rejects.toThrow()
    await logar(app, 'ana@t.com', 'nova-senha-123')

    // O código já usado não vale de novo
    const reuso = await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ email: 'ana@t.com', codigo, novaSenha: 'outra-senha-123' })
    expect(reuso.body.codigo).toBe('CODIGO_INVALIDO')
  })

  it('quem redefine a senha pelo código também confirma o e-mail', async () => {
    await criarUsuario({ email: 'ana@t.com', vinculado: false, emailConfirmado: false })
    await request(app).post('/api/auth/esqueci-senha').send({ email: 'ana@t.com' })
    await request(app)
      .post('/api/auth/redefinir-senha')
      .send({ email: 'ana@t.com', codigo: ultimoCodigo('ana@t.com'), novaSenha: 'nova-senha-123' })

    const ana = await prisma.usuario.findUniqueOrThrow({ where: { email: 'ana@t.com' } })
    expect(ana.emailVerificadoEm).not.toBeNull()
  })
})

describe('exclusão da conta da academia', () => {
  it('desfaz vínculos, turmas e códigos; os PRs ficam com os alunos', async () => {
    const box = await cadastrar({
      nome: 'Box Centro',
      email: 'box@t.com',
      senha: 'senha-forte-123',
      tipo: 'ACADEMIA',
    })
    const academiaId = box.res.body.usuario.academia.id
    await prisma.usuario.update({
      where: { email: 'box@t.com' },
      data: { emailVerificadoEm: new Date(), consentimentoEm: new Date() },
    })
    const ana = await criarUsuario({ email: 'ana@t.com', vinculado: false })
    await prisma.vinculoAluno.create({ data: { alunoId: ana.id, academiaId } })
    const wallBall = (
      await box.agente
        .post(`/api/c/${academiaId}/exercicios`)
        .send({ nome: 'Wall Ball', categoria: 'OUTRO' })
    ).body
    await prisma.testeCarga.create({
      data: { usuarioId: ana.id, exercicioId: wallBall.id, dataTeste: new Date(), cargaKg: 9 },
    })

    const res = await box.agente.post('/api/auth/excluir-conta').send({ senha: 'senha-forte-123' })

    expect(res.status).toBe(204)
    expect(await prisma.academia.count()).toBe(0)
    expect(await prisma.vinculoAluno.count()).toBe(0)
    expect(await prisma.testeCarga.count({ where: { usuarioId: ana.id } })).toBe(1)
    expect(await prisma.exercicio.findUnique({ where: { id: wallBall.id } })).toMatchObject({
      academiaId: null,
    })
  })
})
