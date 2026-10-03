import { type RequestHandler, Router } from 'express'
import { z } from 'zod'
import type { Usuario } from '../generated/prisma/client.ts'
import { ErroHttp } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { gerarHashSenha, verificarSenha } from '../lib/senha.ts'
import { autenticar } from '../middlewares/autenticacao.ts'
import {
  abrirSessao,
  buscarSessaoValida,
  COOKIE_REFRESH,
  limparCookies,
  revogarSessao,
  revogarTodasAsSessoes,
} from '../services/sessoes.ts'

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('E-mail inválido')),
  senha: z.string().min(1, 'Informe a senha'),
})

export const novaSenhaSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .max(128, 'A senha pode ter no máximo 128 caracteres')

const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: novaSenhaSchema,
})

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails estão cadastrados
const HASH_FICTICIO = gerarHashSenha('senha-ficticia-para-tempo-constante')

/** Dados do usuário que podem ser enviados ao front (nunca o hash da senha). */
export async function usuarioPublico(usuario: Usuario) {
  const turma = usuario.turmaId
    ? await prisma.turma.findUnique({ where: { id: usuario.turmaId } })
    : null
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    perfil: usuario.perfil,
    turma: turma ? { id: turma.id, nome: turma.nome } : null,
    trocarSenha: usuario.trocarSenha,
    consentimentoPendente: !usuario.consentimentoEm,
  }
}

export function authRouter({ limitarLogin }: { limitarLogin: RequestHandler }) {
  const router = Router()

  router.post('/login', limitarLogin, async (req, res) => {
    const { email, senha } = loginSchema.parse(req.body)
    const usuario = await prisma.usuario.findUnique({ where: { email } })

    const senhaOk = await verificarSenha(senha, usuario?.senhaHash ?? (await HASH_FICTICIO))
    if (!usuario || !senhaOk || !usuario.ativo) {
      throw new ErroHttp(401, 'E-mail ou senha incorretos', 'CREDENCIAIS_INVALIDAS')
    }

    await abrirSessao(res, usuario)
    res.json({ usuario: await usuarioPublico(usuario) })
  })

  router.post('/refresh', async (req, res) => {
    const refresh: string | undefined = req.cookies?.[COOKIE_REFRESH]
    const sessao = refresh ? await buscarSessaoValida(refresh) : null
    if (!sessao) {
      limparCookies(res)
      throw new ErroHttp(401, 'Sessão expirada', 'SESSAO_EXPIRADA')
    }

    // Rotação: o refresh token usado é revogado e um novo é emitido
    await revogarSessao(sessao.id)
    await abrirSessao(res, sessao.usuario)
    res.json({ usuario: await usuarioPublico(sessao.usuario) })
  })

  router.post('/logout', async (req, res) => {
    const refresh: string | undefined = req.cookies?.[COOKIE_REFRESH]
    const sessao = refresh ? await buscarSessaoValida(refresh) : null
    if (sessao) await revogarSessao(sessao.id)
    limparCookies(res)
    res.status(204).end()
  })

  router.get('/me', autenticar, async (req, res) => {
    res.json({ usuario: await usuarioPublico(req.usuario!) })
  })

  router.post('/trocar-senha', autenticar, async (req, res) => {
    const { senhaAtual, novaSenha } = trocarSenhaSchema.parse(req.body)
    const usuario = req.usuario!

    if (!(await verificarSenha(senhaAtual, usuario.senhaHash))) {
      throw new ErroHttp(400, 'A senha atual está incorreta', 'SENHA_ATUAL_INCORRETA')
    }
    if (senhaAtual === novaSenha) {
      throw new ErroHttp(400, 'A nova senha precisa ser diferente da atual', 'SENHA_REPETIDA')
    }

    const atualizado = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { senhaHash: await gerarHashSenha(novaSenha), trocarSenha: false },
    })

    // Encerra as outras sessões (ex.: outro celular) e abre uma nova para este dispositivo
    await revogarTodasAsSessoes(usuario.id)
    await abrirSessao(res, atualizado)
    res.json({ usuario: await usuarioPublico(atualizado) })
  })

  router.post('/consentimento', autenticar, async (req, res) => {
    const atualizado = await prisma.usuario.update({
      where: { id: req.usuario!.id },
      data: { consentimentoEm: req.usuario!.consentimentoEm ?? new Date() },
    })
    res.json({ usuario: await usuarioPublico(atualizado) })
  })

  return router
}
