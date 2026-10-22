import request from 'supertest'
import { criarApp } from '../src/app.ts'
import { prisma } from '../src/lib/prisma.ts'
import { normalizarTexto } from '../src/lib/texto.ts'
import { gerarHashSenha } from '../src/lib/senha.ts'

export const SENHA = 'senha-correta-123'

export function criarAppDeTeste() {
  // O limite de tentativas de código é testado à parte; nos demais testes não atrapalha
  process.env.LIMITE_CODIGOS ??= '1000'
  process.env.LIMITE_CADASTRO ??= '1000'
  return criarApp({
    verificarBanco: async () => true,
    webOrigin: 'http://localhost:5173',
    limitarLogin: (_req, _res, next) => next(),
  })
}

export async function limparBanco() {
  academiaAtual = null
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE apelidos_vinculo, vinculos_aluno, codigos_vinculo, professores_academia,
       locais_professor, academias, sessoes, testes_carga, importacoes, exercicio_alias,
       exercicios, usuarios, turmas RESTART IDENTITY CASCADE`,
  )
}

// O scrypt é propositalmente lento; o hash da senha padrão é calculado uma única vez
let hashSenhaPadrao: Promise<string> | undefined
const hashPadrao = () => (hashSenhaPadrao ??= gerarHashSenha(SENHA))

// Academia usada pela maior parte dos testes: o "treinador" é professor dela e os alunos
// são vinculados a ela. Criada na primeira vez que um teste precisa.
let academiaAtual: { id: number; contaId: number } | null = null

export const EMAIL_ACADEMIA = 'academia@teste.com'

export async function academiaDeTeste() {
  if (academiaAtual) return academiaAtual
  const conta = await prisma.usuario.create({
    data: {
      nome: 'Box Teste',
      email: EMAIL_ACADEMIA,
      tipo: 'ACADEMIA',
      emailVerificadoEm: new Date(),
      consentimentoEm: new Date(),
      senhaHash: await hashPadrao(),
    },
  })
  const academia = await prisma.academia.create({ data: { nome: 'Box Teste', contaId: conta.id } })
  academiaAtual = { id: academia.id, contaId: conta.id }
  return academiaAtual
}

/** Rota de gestão no contexto da academia de teste (antigo /api/admin). */
export function admin(caminho: string) {
  if (!academiaAtual) throw new Error('Crie a academia de teste antes (logarComoTreinador)')
  return `/api/c/${academiaAtual.id}${caminho}`
}

export async function criarTurma(nome: string, horario: string | null = null) {
  const { id } = await academiaDeTeste()
  return prisma.turma.create({ data: { nome, horario, academiaId: id } })
}

type NovoUsuario = {
  nome?: string
  email: string
  /** TREINADOR: professor da academia de teste. ALUNO: vinculado a ela (padrão). */
  perfil?: 'ALUNO' | 'TREINADOR'
  ativo?: boolean
  /** false: ainda não digitou o código enviado ao e-mail */
  emailConfirmado?: boolean
  consentido?: boolean
  /** Turma do aluno na academia de teste */
  turmaId?: number | null
  /** false: conta sem nenhum vínculo */
  vinculado?: boolean
}

export async function criarUsuario({
  nome = 'Usuário de Teste',
  email,
  perfil = 'ALUNO',
  ativo = true,
  emailConfirmado = true,
  consentido = true,
  turmaId = null,
  vinculado = true,
}: NovoUsuario) {
  const usuario = await prisma.usuario.create({
    data: {
      nome,
      email,
      ehProfessor: perfil === 'TREINADOR',
      ativo,
      emailVerificadoEm: emailConfirmado ? new Date() : null,
      consentimentoEm: consentido ? new Date() : null,
      senhaHash: await hashPadrao(),
    },
  })
  if (vinculado) {
    const academia = await academiaDeTeste()
    if (perfil === 'TREINADOR') {
      await prisma.professorAcademia.create({
        data: { academiaId: academia.id, professorId: usuario.id },
      })
    } else {
      await prisma.vinculoAluno.create({
        data: { alunoId: usuario.id, academiaId: academia.id, turmaId },
      })
    }
  }
  return usuario
}

/** Apelido do aluno na academia de teste (ex.: "Lurdinha"). */
export async function apelidar(alunoId: number, apelido: string) {
  const academia = await academiaDeTeste()
  const vinculo = await prisma.vinculoAluno.findFirstOrThrow({
    where: { alunoId, academiaId: academia.id },
  })
  return prisma.apelidoVinculo.create({
    data: { vinculoId: vinculo.id, apelido: normalizarTexto(apelido) },
  })
}

/** Agente HTTP (mantém os cookies entre as requisições) já autenticado. */
export async function logar(app: ReturnType<typeof criarAppDeTeste>, email: string, senha = SENHA) {
  const agente = request.agent(app)
  const res = await agente.post('/api/auth/login').send({ email, senha })
  if (res.status !== 200) throw new Error(`Falha no login de ${email}: ${res.status}`)
  return agente
}

/** Professor da academia de teste, já logado. */
export async function logarComoTreinador(app: ReturnType<typeof criarAppDeTeste>) {
  await criarUsuario({ nome: 'Treinador', email: 'treinador@teste.com', perfil: 'TREINADOR' })
  return logar(app, 'treinador@teste.com')
}

/** Conta da academia de teste, já logada. */
export async function logarComoAcademia(app: ReturnType<typeof criarAppDeTeste>) {
  await academiaDeTeste()
  return logar(app, EMAIL_ACADEMIA)
}

export function cookiesDe(res: request.Response): string[] {
  const valor = res.headers['set-cookie'] as unknown as string[] | string | undefined
  return Array.isArray(valor) ? valor : valor ? [valor] : []
}
