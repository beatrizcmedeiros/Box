import type { NextFunction, Request, Response } from 'express'
import type { Usuario } from '../generated/prisma/client.ts'
import { ErroHttp } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { verificarTokenAcesso } from '../lib/tokens.ts'
import { acessoDaRequisicao } from '../services/sessoes.ts'

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario
    }
  }
}

/** Exige um token de acesso válido (cookie na web, Bearer no app) e um usuário ativo. */
export async function autenticar(req: Request, _res: Response, next: NextFunction) {
  const token = acessoDaRequisicao(req)
  if (!token) throw new ErroHttp(401, 'Não autenticado', 'NAO_AUTENTICADO')

  const payload = await verificarTokenAcesso(token)
  if (!payload) throw new ErroHttp(401, 'Sessão expirada', 'TOKEN_INVALIDO')

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.usuarioId } })
  if (!usuario || !usuario.ativo) throw new ErroHttp(401, 'Não autenticado', 'NAO_AUTENTICADO')

  req.usuario = usuario
  next()
}

/** Bloqueia o uso do sistema enquanto a pessoa não aceitar o termo de consentimento (LGPD). */
export function exigirCadastroCompleto(req: Request, _res: Response, next: NextFunction) {
  const usuario = req.usuario!
  if (!usuario.consentimentoEm) {
    throw new ErroHttp(
      403,
      'É necessário aceitar o termo de consentimento',
      'CONSENTIMENTO_PENDENTE',
    )
  }
  next()
}

const semPermissao = (mensagem: string) => new ErroHttp(403, mensagem, 'SEM_PERMISSAO')

/** Área "Meus PRs": qualquer pessoa (aluno ou professor), não a conta da academia. */
export function exigirPessoa(req: Request, _res: Response, next: NextFunction) {
  if (req.usuario?.tipo !== 'PESSOA') throw semPermissao('Disponível apenas para contas pessoais')
  next()
}

export function exigirProfessor(req: Request, _res: Response, next: NextFunction) {
  if (req.usuario?.tipo !== 'PESSOA' || !req.usuario.ehProfessor) {
    throw semPermissao('Disponível apenas para professores')
  }
  next()
}

export function exigirAcademia(req: Request, _res: Response, next: NextFunction) {
  if (req.usuario?.tipo !== 'ACADEMIA') throw semPermissao('Disponível apenas para academias')
  next()
}
