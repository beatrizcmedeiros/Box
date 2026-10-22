// Dados de exemplo para desenvolvimento (nunca rodam em produção):
//  - academia de demonstração (conta própria) com 4 turmas;
//  - professor, membro da academia;
//  - aluna com PRs de exemplo, vinculada à academia.
// A lista padrão de exercícios vem da migration 20261022150000_exercicios_padrao.
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.ts'
import { gerarHashSenha } from '../src/lib/senha.ts'

try {
  process.loadEnvFile()
} catch {
  // sem .env: usa as variáveis do ambiente
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const turmas = [
  { nome: 'Turma 06h', horario: '06:00' },
  { nome: 'Turma 07h', horario: '07:00' },
  { nome: 'Turma 18h', horario: '18:00' },
  { nome: 'Turma 19h', horario: '19:00' },
]

const credenciais = (prefixo: string) => {
  const email = process.env[`${prefixo}_EMAIL`]?.trim().toLowerCase()
  const senha = process.env[`${prefixo}_SENHA`]
  return email && senha ? { email, senha } : null
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Seed ignorado em produção.')
    return
  }
  const academia = await criarAcademiaDeDemonstracao()
  const professor = await criarProfessorDeDesenvolvimento(academia?.id)
  await criarAlunaDeDemonstracao(academia?.id)
  console.log(
    `Seed concluído${academia ? `: academia "${academia.nome}" com ${turmas.length} turmas` : ''}${professor ? ' e professor' : ''}.`,
  )
}

/** Conta da academia, com as credenciais do api/.env. */
async function criarAcademiaDeDemonstracao() {
  const acesso = credenciais('SEED_ACADEMIA')
  if (!acesso) return null

  const conta =
    (await prisma.usuario.findUnique({ where: { email: acesso.email } })) ??
    (await prisma.usuario.create({
      data: {
        nome: 'Box Demonstração',
        email: acesso.email,
        senhaHash: await gerarHashSenha(acesso.senha),
        tipo: 'ACADEMIA',
        emailVerificadoEm: new Date(),
        consentimentoEm: new Date(),
      },
    }))
  const academia =
    (await prisma.academia.findUnique({ where: { contaId: conta.id } })) ??
    (await prisma.academia.create({ data: { nome: 'Box Demonstração', contaId: conta.id } }))

  for (const turma of turmas) {
    const existe = await prisma.turma.findFirst({
      where: { academiaId: academia.id, nome: turma.nome },
    })
    if (!existe) await prisma.turma.create({ data: { ...turma, academiaId: academia.id } })
  }
  return academia
}

/** Professor para testar localmente, membro da academia de demonstração. */
async function criarProfessorDeDesenvolvimento(academiaId?: number) {
  const acesso = credenciais('SEED_TREINADOR')
  if (!acesso) return null

  const professor = await prisma.usuario.upsert({
    where: { email: acesso.email },
    update: { ehProfessor: true },
    create: {
      nome: 'Professor (desenvolvimento)',
      email: acesso.email,
      senhaHash: await gerarHashSenha(acesso.senha),
      ehProfessor: true,
      emailVerificadoEm: new Date(),
      consentimentoEm: new Date(),
    },
  })
  if (academiaId) {
    await prisma.professorAcademia.upsert({
      where: { academiaId_professorId: { academiaId, professorId: professor.id } },
      update: {},
      create: { academiaId, professorId: professor.id },
    })
  }
  return professor
}

// Histórico usado nas telas de modelo do relatório (Figuras 1 e 2)
const historicoDemonstracao: [exercicio: string, data: string, cargaKg: number][] = [
  ['Back Squat', '2025-03-14', 92.5],
  ['Back Squat', '2025-09-12', 100],
  ['Back Squat', '2026-03-15', 105],
  ['Deadlift', '2026-03-15', 120],
  ['Front Squat', '2026-03-16', 85],
  ['Clean', '2026-03-17', 70],
  ['Snatch', '2026-03-17', 55],
  ['Push Press', '2026-03-18', 60],
]

/** Aluna com PRs de exemplo, vinculada à academia de demonstração (Turma 18h). */
async function criarAlunaDeDemonstracao(academiaId?: number) {
  const acesso = credenciais('SEED_ALUNO')
  if (!acesso) return

  let aluna = await prisma.usuario.findUnique({ where: { email: acesso.email } })
  if (!aluna) {
    aluna = await prisma.usuario.create({
      data: {
        nome: 'Ana Souza (demonstração)',
        email: acesso.email,
        senhaHash: await gerarHashSenha(acesso.senha),
        emailVerificadoEm: new Date(),
        consentimentoEm: new Date(),
      },
    })
    for (const [nome, data, cargaKg] of historicoDemonstracao) {
      const exercicio = await prisma.exercicio.findFirstOrThrow({
        where: { nome, escopo: 'PADRAO' },
      })
      await prisma.testeCarga.create({
        data: {
          usuarioId: aluna.id,
          exercicioId: exercicio.id,
          dataTeste: new Date(`${data}T00:00:00.000Z`),
          cargaKg,
        },
      })
    }
  }

  if (academiaId) {
    const turma = await prisma.turma.findFirst({ where: { academiaId, nome: 'Turma 18h' } })
    const vinculo = await prisma.vinculoAluno.findFirst({
      where: { alunoId: aluna.id, academiaId },
    })
    if (!vinculo) {
      await prisma.vinculoAluno.create({
        data: { alunoId: aluna.id, academiaId, turmaId: turma?.id },
      })
    }
  }
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
