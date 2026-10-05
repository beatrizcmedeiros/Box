import request from 'supertest'
import { criarApp } from '../src/app.ts'
import type { Perfil } from '../src/generated/prisma/client.ts'
import { prisma } from '../src/lib/prisma.ts'
import { gerarHashSenha } from '../src/lib/senha.ts'

export const SENHA = 'senha-correta-123'

export function criarAppDeTeste() {
  return criarApp({
    verificarBanco: async () => true,
    webOrigin: 'http://localhost:5173',
    limitarLogin: (_req, _res, next) => next(),
  })
}

export async function limparBanco() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE aluno_apelido, sessoes, testes_carga, importacoes, exercicio_alias, exercicios, usuarios, turmas RESTART IDENTITY CASCADE',
  )
}

// O scrypt é propositalmente lento; o hash da senha padrão é calculado uma única vez
let hashSenhaPadrao: Promise<string> | undefined

type NovoUsuario = {
  nome?: string
  email: string
  perfil?: Perfil
  ativo?: boolean
  trocarSenha?: boolean
  consentido?: boolean
  turmaId?: number | null
}

export async function criarUsuario({
  nome = 'Usuário de Teste',
  email,
  perfil = 'ALUNO',
  ativo = true,
  trocarSenha = false,
  consentido = true,
  turmaId = null,
}: NovoUsuario) {
  hashSenhaPadrao ??= gerarHashSenha(SENHA)
  return prisma.usuario.create({
    data: {
      nome,
      email,
      perfil,
      ativo,
      trocarSenha,
      turmaId,
      consentimentoEm: consentido ? new Date() : null,
      senhaHash: await hashSenhaPadrao,
    },
  })
}

/** Agente HTTP (mantém os cookies entre as requisições) já autenticado. */
export async function logar(app: ReturnType<typeof criarAppDeTeste>, email: string, senha = SENHA) {
  const agente = request.agent(app)
  const res = await agente.post('/api/auth/login').send({ email, senha })
  if (res.status !== 200) throw new Error(`Falha no login de ${email}: ${res.status}`)
  return agente
}

export async function logarComoTreinador(app: ReturnType<typeof criarAppDeTeste>) {
  await criarUsuario({ nome: 'Treinador', email: 'treinador@teste.com', perfil: 'TREINADOR' })
  return logar(app, 'treinador@teste.com')
}

export function cookiesDe(res: request.Response): string[] {
  const valor = res.headers['set-cookie'] as unknown as string[] | string | undefined
  return Array.isArray(valor) ? valor : valor ? [valor] : []
}
