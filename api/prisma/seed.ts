// Dados de exemplo para desenvolvimento: turmas, treinador e aluna de demonstração.
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

async function main() {
  for (const turma of turmas) {
    await prisma.turma.upsert({ where: { nome: turma.nome }, update: turma, create: turma })
  }

  console.log(`Seed concluído: ${turmas.length} turmas.`)

  await criarTreinadorDeDesenvolvimento()
  await criarAlunaDeDemonstracao()
}

/** Treinador para testar localmente, com as credenciais do api/.env. Nunca roda em produção. */
async function criarTreinadorDeDesenvolvimento() {
  const email = process.env.SEED_TREINADOR_EMAIL?.trim().toLowerCase()
  const senha = process.env.SEED_TREINADOR_SENHA
  if (process.env.NODE_ENV === 'production' || !email || !senha) return

  const existente = await prisma.usuario.findUnique({ where: { email } })
  if (existente) {
    console.log(`Treinador de desenvolvimento já existe: ${email}`)
    return
  }
  await prisma.usuario.create({
    data: {
      nome: 'Treinador (desenvolvimento)',
      email,
      senhaHash: await gerarHashSenha(senha),
      perfil: 'TREINADOR',
      trocarSenha: false,
    },
  })
  console.log(`Treinador de desenvolvimento criado: ${email} (senha em api/.env)`)
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

/** Aluna com PRs de exemplo, para testar e demonstrar a área do aluno. Nunca roda em produção. */
async function criarAlunaDeDemonstracao() {
  const email = process.env.SEED_ALUNO_EMAIL?.trim().toLowerCase()
  const senha = process.env.SEED_ALUNO_SENHA
  if (process.env.NODE_ENV === 'production' || !email || !senha) return

  if (await prisma.usuario.findUnique({ where: { email } })) {
    console.log(`Aluna de demonstração já existe: ${email}`)
    return
  }
  const turma = await prisma.turma.findUnique({ where: { nome: 'Turma 18h' } })
  const aluna = await prisma.usuario.create({
    data: {
      nome: 'Ana Souza (demonstração)',
      email,
      senhaHash: await gerarHashSenha(senha),
      perfil: 'ALUNO',
      turmaId: turma?.id,
      trocarSenha: false,
      consentimentoEm: new Date(),
    },
  })
  for (const [nome, data, cargaKg] of historicoDemonstracao) {
    const exercicio = await prisma.exercicio.findUniqueOrThrow({ where: { nome } })
    await prisma.testeCarga.create({
      data: {
        usuarioId: aluna.id,
        exercicioId: exercicio.id,
        dataTeste: new Date(`${data}T00:00:00.000Z`),
        cargaKg,
      },
    })
  }
  console.log(`Aluna de demonstração criada: ${email} (senha em api/.env)`)
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
