// Dados iniciais de exemplo. A lista real de exercícios e turmas deve ser
// confirmada com o treinador do box (Fase 0 do plano).
import { PrismaPg } from '@prisma/adapter-pg'
import { type CategoriaExercicio, PrismaClient } from '../src/generated/prisma/client.ts'

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
    for (const alias of aliases) {
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
}

main()
  .catch((erro) => {
    console.error(erro)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
