// Dados iniciais de exemplo. A lista real de exercícios e turmas deve ser
// confirmada com o treinador do box (Fase 0 do plano).
import { PrismaPg } from '@prisma/adapter-pg'
import { type CategoriaExercicio, PrismaClient } from '../src/generated/prisma/client.ts'
import { gerarHashSenha } from '../src/lib/senha.ts'
import { normalizarTexto } from '../src/lib/texto.ts'

try {
  process.loadEnvFile()
} catch {
  // sem .env: usa as variáveis do ambiente
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const exercicios: { nome: string; categoria: CategoriaExercicio; aliases: string[] }[] = [
  { nome: 'Back Squat', categoria: 'LEVANTAMENTO', aliases: ['agachamento livre', 'back sq'] },
  { nome: 'Front Squat', categoria: 'LEVANTAMENTO', aliases: ['agachamento frontal', 'front sq'] },
  { nome: 'Deadlift', categoria: 'LEVANTAMENTO', aliases: ['levantamento terra', 'terra'] },
  {
    nome: 'Shoulder Press',
    categoria: 'LEVANTAMENTO',
    aliases: ['strict press', 'desenvolvimento'],
  },
  { nome: 'Push Press', categoria: 'LEVANTAMENTO', aliases: ['push pres'] },
  { nome: 'Bench Press', categoria: 'LEVANTAMENTO', aliases: ['supino', 'supino reto'] },
  { nome: 'Clean', categoria: 'OLIMPICO', aliases: ['power clean', 'squat clean'] },
  { nome: 'Clean & Jerk', categoria: 'OLIMPICO', aliases: ['clean and jerk', 'arremesso'] },
  { nome: 'Snatch', categoria: 'OLIMPICO', aliases: ['arranco', 'power snatch'] },
]

const turmas = [
  { nome: 'Turma 06h', horario: '06:00' },
  { nome: 'Turma 07h', horario: '07:00' },
  { nome: 'Turma 18h', horario: '18:00' },
  { nome: 'Turma 19h', horario: '19:00' },
]

async function main() {
  for (const { nome, categoria, aliases } of exercicios) {
    const exercicio = await prisma.exercicio.upsert({
      where: { nome },
      update: { categoria },
      create: { nome, categoria },
    })
    for (const alias of aliases.map(normalizarTexto)) {
      await prisma.exercicioAlias.upsert({
        where: { alias },
        update: { exercicioId: exercicio.id },
        create: { alias, exercicioId: exercicio.id },
      })
    }
  }

  for (const turma of turmas) {
    await prisma.turma.upsert({ where: { nome: turma.nome }, update: turma, create: turma })
  }

  console.log(`Seed concluído: ${exercicios.length} exercícios e ${turmas.length} turmas.`)

  await criarTreinadorDeDesenvolvimento()
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

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
