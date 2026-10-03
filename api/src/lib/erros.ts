import type { ErrorRequestHandler } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '../generated/prisma/client.ts'

export class ErroHttp extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly codigo?: string,
  ) {
    super(mensagem)
  }
}

export const naoEncontrado = (recurso: string) => new ErroHttp(404, `${recurso} não encontrado(a)`)

export const tratarErros: ErrorRequestHandler = (erro, _req, res, _next) => {
  if (erro instanceof ErroHttp) {
    res.status(erro.status).json({ erro: erro.message, codigo: erro.codigo })
    return
  }

  if (erro instanceof ZodError) {
    res.status(400).json({
      erro: 'Dados inválidos',
      campos: erro.issues.map((i) => ({ campo: i.path.join('.'), mensagem: i.message })),
    })
    return
  }

  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    if (erro.code === 'P2002') {
      res.status(409).json({ erro: 'Já existe um registro com esses dados' })
      return
    }
    if (erro.code === 'P2003') {
      res.status(409).json({ erro: 'O registro está em uso e não pode ser removido' })
      return
    }
    if (erro.code === 'P2025') {
      res.status(404).json({ erro: 'Registro não encontrado' })
      return
    }
  }

  // JSON malformado no corpo da requisição
  if (erro?.type === 'entity.parse.failed') {
    res.status(400).json({ erro: 'JSON inválido' })
    return
  }

  console.error(erro)
  res.status(500).json({ erro: 'Erro interno do servidor' })
}
