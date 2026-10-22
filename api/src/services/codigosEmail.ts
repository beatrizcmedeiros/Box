import type { TipoCodigoEmail, Usuario } from '../generated/prisma/client.ts'
import { ErroHttp } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { hashToken } from '../lib/tokens.ts'
import { sortearCodigo } from './codigos.ts'
import { emailComCodigo, enviarEmail } from './email.ts'

const VALIDADE_MS = 15 * 60 * 1000
const MAX_TENTATIVAS = 5
/** Intervalo mínimo entre dois envios do mesmo tipo para a mesma pessoa. */
const ESPERA_REENVIO_MS = 60 * 1000

const FINALIDADE: Record<TipoCodigoEmail, string> = {
  CONFIRMAR_EMAIL: 'confirmar o seu e-mail',
  REDEFINIR_SENHA: 'criar uma nova senha',
}

/**
 * Gera e envia um código novo por e-mail; o anterior do mesmo tipo deixa de valer.
 * Recusa reenvios muito próximos (proteção contra abuso).
 */
export async function enviarCodigoEmail(usuario: Usuario, tipo: TipoCodigoEmail) {
  const recente = await prisma.codigoEmail.findFirst({
    where: {
      usuarioId: usuario.id,
      tipo,
      criadoEm: { gt: new Date(Date.now() - ESPERA_REENVIO_MS) },
    },
  })
  if (recente) {
    throw new ErroHttp(429, 'Aguarde um minuto antes de pedir outro código.', 'AGUARDE_REENVIO')
  }

  const codigo = sortearCodigo()
  await prisma.$transaction([
    prisma.codigoEmail.updateMany({
      where: { usuarioId: usuario.id, tipo, usadoEm: null },
      data: { usadoEm: new Date() },
    }),
    prisma.codigoEmail.create({
      data: {
        usuarioId: usuario.id,
        tipo,
        codigoHash: hashToken(codigo),
        expiraEm: new Date(Date.now() + VALIDADE_MS),
      },
    }),
  ])
  await enviarEmail(emailComCodigo(usuario.email, usuario.nome, codigo, FINALIDADE[tipo]))
}

/**
 * Confere o código digitado. Cada erro conta uma tentativa; depois de 5, é preciso pedir outro.
 * Se estiver certo, o código é consumido (não pode ser usado de novo).
 */
export async function validarCodigoEmail(usuarioId: number, tipo: TipoCodigoEmail, codigo: string) {
  const vigente = await prisma.codigoEmail.findFirst({
    where: { usuarioId, tipo, usadoEm: null, expiraEm: { gt: new Date() } },
    orderBy: { criadoEm: 'desc' },
  })
  const invalido = new ErroHttp(
    400,
    'Código inválido ou expirado. Peça um novo código.',
    'CODIGO_INVALIDO',
  )
  if (!vigente || vigente.tentativas >= MAX_TENTATIVAS) throw invalido

  if (vigente.codigoHash !== hashToken(codigo.replace(/\D/g, ''))) {
    await prisma.codigoEmail.update({
      where: { id: vigente.id },
      data: { tentativas: { increment: 1 } },
    })
    throw invalido
  }
  await prisma.codigoEmail.update({ where: { id: vigente.id }, data: { usadoEm: new Date() } })
}
