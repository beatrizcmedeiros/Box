import { randomInt } from 'node:crypto'
import { z } from 'zod'
import type { TipoCodigo } from '../generated/prisma/client.ts'
import { ErroHttp } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'

/** Validade escolhida ao gerar: 15 dias, 30 dias ou sem validade. */
export const validadeSchema = z.object({
  validade: z.enum(['15', '30', 'nunca'], 'Escolha a validade: 15, 30 dias ou sem validade'),
})

const MS_DIA = 24 * 60 * 60 * 1000

type Dono = { academiaId: number } | { professorId: number }

/** Código de 6 dígitos (com zeros à esquerda), sorteado com gerador criptográfico. */
export const sortearCodigo = () => String(randomInt(0, 1_000_000)).padStart(6, '0')

const ativo = () => ({
  revogadoEm: null,
  OR: [{ expiraEm: null }, { expiraEm: { gt: new Date() } }],
})

/** Código vigente do dono para aquele tipo, ou null. */
export async function codigoAtual(tipo: TipoCodigo, dono: Dono) {
  const codigo = await prisma.codigoVinculo.findFirst({
    where: { tipo, ...dono, ...ativo() },
    orderBy: { criadoEm: 'desc' },
  })
  return codigo && formatarCodigo(codigo)
}

export const formatarCodigo = (c: { codigo: string; expiraEm: Date | null; criadoEm: Date }) => ({
  codigo: c.codigo,
  expiraEm: c.expiraEm,
  criadoEm: c.criadoEm,
})

/** Gera um código novo e revoga o anterior do mesmo dono e tipo. */
export async function gerarCodigo(tipo: TipoCodigo, dono: Dono, validade: '15' | '30' | 'nunca') {
  const expiraEm = validade === 'nunca' ? null : new Date(Date.now() + Number(validade) * MS_DIA)

  return prisma.$transaction(async (tx) => {
    await tx.codigoVinculo.updateMany({
      where: { tipo, ...dono, revogadoEm: null },
      data: { revogadoEm: new Date() },
    })
    // Sorteia até achar um código livre (o índice único impede repetir um código ativo)
    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const codigo = sortearCodigo()
      const emUso = await tx.codigoVinculo.findFirst({ where: { codigo, revogadoEm: null } })
      if (emUso) continue
      return formatarCodigo(
        await tx.codigoVinculo.create({ data: { codigo, tipo, expiraEm, ...dono } }),
      )
    }
    throw new ErroHttp(503, 'Não foi possível gerar o código agora. Tente de novo.')
  })
}

/** Desativa o código vigente (ninguém mais consegue usá-lo). */
export async function revogarCodigo(tipo: TipoCodigo, dono: Dono) {
  await prisma.codigoVinculo.updateMany({
    where: { tipo, ...dono, revogadoEm: null },
    data: { revogadoEm: new Date() },
  })
}

/** Busca um código válido (não revogado e não expirado). */
export async function buscarCodigoValido(codigo: string) {
  const limpo = codigo.replace(/\D/g, '')
  if (limpo.length !== 6) return null
  return prisma.codigoVinculo.findFirst({
    where: { codigo: limpo, ...ativo() },
    include: {
      academia: { select: { id: true, nome: true } },
      professor: { select: { id: true, nome: true, ehProfessor: true, ativo: true } },
    },
  })
}
