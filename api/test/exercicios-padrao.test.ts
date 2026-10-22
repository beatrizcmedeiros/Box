import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma } from '../src/lib/prisma.ts'
import { limparBanco } from './apoio.ts'

// O banco de testes é limpo antes de cada teste; aqui a migration é aplicada de novo
// para conferir que ela cria a lista padrão e que pode rodar sobre dados existentes.
const sql = readFileSync(
  new URL('../prisma/migrations/20261022150000_exercicios_padrao/migration.sql', import.meta.url),
  'utf8',
)

async function aplicarMigration() {
  // O driver não aceita vários comandos numa chamada; executa um por vez
  const comandos = sql
    .replace(/^--.*$/gm, '')
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
  for (const comando of comandos) await prisma.$executeRawUnsafe(comando)
}

beforeEach(limparBanco)

describe('migration de exercícios padrão', () => {
  it('cria os exercícios principais com os nomes alternativos', async () => {
    await aplicarMigration()

    const nomes = (await prisma.exercicio.findMany({ select: { nome: true } })).map((e) => e.nome)
    expect(nomes).toEqual(
      expect.arrayContaining(['Back Squat', 'Deadlift', 'Clean & Jerk', 'Snatch', 'Power Clean']),
    )
    const terra = await prisma.exercicioAlias.findUnique({
      where: { alias: 'levantamento terra' },
      include: { exercicio: true },
    })
    expect(terra?.exercicio.nome).toBe('Deadlift')
  })

  it('não altera exercícios existentes e move "power clean" para o exercício próprio', async () => {
    const clean = await prisma.exercicio.create({
      data: { nome: 'Clean', categoria: 'OLIMPICO', ativo: false },
    })
    await prisma.exercicioAlias.create({ data: { alias: 'power clean', exercicioId: clean.id } })

    await aplicarMigration()
    await aplicarMigration() // rodar de novo não duplica nada

    expect(await prisma.exercicio.findUnique({ where: { nome: 'Clean' } })).toMatchObject({
      id: clean.id,
      ativo: false,
    })
    expect(await prisma.exercicioAlias.findUnique({ where: { alias: 'power clean' } })).toBeNull()
    expect(await prisma.exercicio.count({ where: { nome: 'Back Squat' } })).toBe(1)
  })
})
