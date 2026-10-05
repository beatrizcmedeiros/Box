// Gera alunos FICTÍCIOS com dois testes de força semestrais, para demonstrar a consulta de cargas.
// Uso (somente desenvolvimento):
//   npm run demo -w api            → cria (ou recria) os dados
//   npm run demo -w api -- --remover → remove os dados de demonstração
import { PrismaPg } from '@prisma/adapter-pg'
import { randomBytes } from 'node:crypto'
import { PrismaClient } from '../src/generated/prisma/client.ts'
import { gerarHashSenha } from '../src/lib/senha.ts'

try {
  process.loadEnvFile()
} catch {
  // sem .env: usa as variáveis do ambiente
}

if (process.env.NODE_ENV === 'production') {
  console.error('Dados de demonstração não podem ser gerados em produção.')
  process.exit(1)
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

const DOMINIO = '@demo.prbox.local'

const NOMES = [
  'Bruno Lima',
  'Diego Rocha',
  'Gustavo Pereira',
  'Helena Martins',
  'Carla Mendes',
  'Eduarda Alves',
  'Felipe Costa',
  'Juliana Ribeiro',
  'Rafael Nunes',
  'Mariana Teixeira',
  'Thiago Barbosa',
  'Larissa Duarte',
  'Pedro Henrique Dias',
  'Camila Freitas',
  'Lucas Moreira',
  'Beatriz Cardoso',
  'Rodrigo Azevedo',
  'Fernanda Lopes',
  'Gabriel Monteiro',
  'Patrícia Gomes',
  'André Cavalcanti',
  'Vanessa Pinto',
  'Marcelo Araújo',
  'Tatiane Rezende',
  'Leonardo Castro',
  'Aline Batista',
  'Vinícius Correia',
  'Priscila Farias',
  'Henrique Vieira',
  'Débora Campos',
  'Caio Fernandes',
  'Renata Moura',
  'Eduardo Santana',
  'Simone Rocha',
  'Matheus Carvalho',
  'Luana Prado',
]

// Faixa de PR (kg) por exercício: [mínimo, máximo]
const FAIXAS: Record<string, [number, number]> = {
  'Back Squat': [55, 170],
  'Front Squat': [45, 140],
  Deadlift: [70, 210],
  Clean: [35, 120],
  Snatch: [25, 95],
  'Push Press': [30, 100],
}

// Pseudoaleatório determinístico: os mesmos dados a cada execução
let semente = 42
const aleatorio = () => (semente = (semente * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
const meioKg = (v: number) => Math.round(v * 2) / 2

async function remover() {
  const { count } = await prisma.usuario.deleteMany({ where: { email: { endsWith: DOMINIO } } })
  return count
}

async function criar() {
  const turmas = await prisma.turma.findMany({ orderBy: { horario: 'asc' } })
  const exercicios = await prisma.exercicio.findMany({
    where: { nome: { in: Object.keys(FAIXAS) } },
  })
  if (turmas.length === 0 || exercicios.length === 0) {
    throw new Error('Rode o seed antes (npm run db:seed) para criar turmas e exercícios.')
  }

  // Senha aleatória descartada: os alunos de demonstração não fazem login
  const senhaHash = await gerarHashSenha(randomBytes(16).toString('hex'))

  let testes = 0
  for (const [i, nome] of NOMES.entries()) {
    const aluno = await prisma.usuario.create({
      data: {
        nome,
        email: `${nome
          .toLowerCase()
          .normalize('NFD')
          .replace(/[^a-z ]/g, '')
          .replace(/ /g, '.')}${DOMINIO}`,
        senhaHash,
        turmaId: turmas[i % turmas.length].id,
        consentimentoEm: new Date(),
        trocarSenha: false,
      },
    })
    const nivel = aleatorio() // alunos mais e menos fortes, de forma consistente entre exercícios
    const dados = exercicios
      .filter(() => aleatorio() > 0.15) // nem todo aluno testou todos os exercícios
      .flatMap((e) => {
        const [min, max] = FAIXAS[e.nome]
        const atual = meioKg(min + (max - min) * (0.15 + 0.7 * nivel + 0.15 * aleatorio()))
        const evolucao = meioKg((aleatorio() - 0.2) * 12) // a maioria evoluiu, alguns caíram
        return [
          {
            usuarioId: aluno.id,
            exercicioId: e.id,
            dataTeste: new Date('2025-09-12'),
            cargaKg: atual - evolucao,
            origem: 'IMPORTACAO' as const,
          },
          {
            usuarioId: aluno.id,
            exercicioId: e.id,
            dataTeste: new Date('2026-03-15'),
            cargaKg: atual,
            origem: 'IMPORTACAO' as const,
          },
        ]
      })
    await prisma.testeCarga.createMany({ data: dados })
    testes += dados.length
  }
  return { alunos: NOMES.length, testes }
}

try {
  const removidos = await remover()
  if (process.argv.includes('--remover')) {
    console.log(`Dados de demonstração removidos: ${removidos} aluno(s).`)
  } else {
    const { alunos, testes } = await criar()
    console.log(
      `Dados de demonstração criados: ${alunos} alunos fictícios e ${testes} testes (e-mails *${DOMINIO}).`,
    )
  }
} finally {
  await prisma.$disconnect()
}
