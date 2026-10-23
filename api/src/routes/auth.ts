import { type RequestHandler, Router } from 'express'
import { ipKeyGenerator, type Options, rateLimit } from 'express-rate-limit'
import { z } from 'zod'
import type { Usuario } from '../generated/prisma/client.ts'
import { ErroHttp } from '../lib/erros.ts'
import { prisma } from '../lib/prisma.ts'
import { gerarHashSenha, verificarSenha } from '../lib/senha.ts'
import { autenticar } from '../middlewares/autenticacao.ts'
import { enviarCodigoEmail, validarCodigoEmail } from '../services/codigosEmail.ts'
import {
  abrirSessao,
  buscarSessaoValida,
  limparCookies,
  refreshDaRequisicao,
  revogarSessao,
  revogarTodasAsSessoes,
} from '../services/sessoes.ts'

const emailSchema = z.string().trim().toLowerCase().pipe(z.email('E-mail inválido'))

const loginSchema = z.object({
  email: emailSchema,
  senha: z.string().min(1, 'Informe a senha'),
})

export const novaSenhaSchema = z
  .string()
  .min(8, 'A senha precisa ter pelo menos 8 caracteres')
  .max(128, 'A senha pode ter no máximo 128 caracteres')

const cadastroSchema = z.object({
  // Na conta da academia, é o nome da academia
  nome: z.string().trim().min(2, 'Informe o nome').max(120),
  email: emailSchema,
  senha: novaSenhaSchema,
  tipo: z.enum(['PESSOA', 'ACADEMIA']).default('PESSOA'),
  ehProfessor: z.boolean().default(false),
})

const redefinirSchema = z.object({
  email: emailSchema,
  codigo: z.string().trim().min(1, 'Digite o código'),
  novaSenha: novaSenhaSchema,
})

const excluirContaSchema = z.object({
  senha: z.string().min(1, 'Informe a senha'),
})

const trocarSenhaSchema = z.object({
  senhaAtual: z.string().min(1, 'Informe a senha atual'),
  novaSenha: novaSenhaSchema,
})

// Hash fixo usado quando o e-mail não existe, para o tempo de resposta não revelar quais e-mails estão cadastrados
const HASH_FICTICIO = gerarHashSenha('senha-ficticia-para-tempo-constante')

/** Dados do usuário que podem ser enviados ao front (nunca o hash da senha). */
export async function usuarioPublico(usuario: Usuario) {
  const academia =
    usuario.tipo === 'ACADEMIA'
      ? await prisma.academia.findUnique({
          where: { contaId: usuario.id },
          select: { id: true, nome: true },
        })
      : null
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    tipo: usuario.tipo,
    ehProfessor: usuario.ehProfessor,
    academia,
    consentimentoPendente: !usuario.consentimentoEm,
  }
}

const UMA_HORA = 60 * 60 * 1000

/**
 * Limites contra abuso do cadastro e da recuperação de senha. LIMITE_CADASTRO
 * multiplica os valores (testes e ambiente de ponta a ponta).
 */
function limite(limitePorHora: number, chave?: Options['keyGenerator']): RequestHandler {
  return rateLimit({
    windowMs: UMA_HORA,
    limit: limitePorHora * Number(process.env.LIMITE_CADASTRO ?? 1),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { erro: 'Muitas tentativas. Tente novamente mais tarde.' },
    ...(chave ? { keyGenerator: chave } : {}),
  })
}

const porIpEEmail: Options['keyGenerator'] = (req) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
  return `${ipKeyGenerator(req.ip ?? '')}:${email}`
}

export function authRouter({ limitarLogin }: { limitarLogin: RequestHandler }) {
  const router = Router()
  const limitarCadastro = limite(10)
  const limitarRecuperacao = limite(5, porIpEEmail)
  const limitarRedefinicao = limite(10, porIpEEmail)

  /**
   * Cadastro aberto: a pessoa (aluno, e opcionalmente professor) ou a academia cria a conta
   * com e-mail e senha. Já entra logada; o passo seguinte é aceitar o termo.
   */
  router.post('/cadastro', limitarCadastro, async (req, res) => {
    const { nome, email, senha, tipo, ehProfessor } = cadastroSchema.parse(req.body)
    if (await prisma.usuario.findUnique({ where: { email } })) {
      throw new ErroHttp(
        409,
        'Este e-mail já tem uma conta. Entre ou use "Esqueci a senha".',
        'EMAIL_EM_USO',
      )
    }

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        email,
        senhaHash: await gerarHashSenha(senha),
        tipo,
        ehProfessor: tipo === 'PESSOA' && ehProfessor,
        ...(tipo === 'ACADEMIA' ? { academia: { create: { nome } } } : {}),
      },
    })

    const tokens = await abrirSessao(req, res, usuario)
    res.status(201).json({ usuario: await usuarioPublico(usuario), tokens })
  })

  router.post('/login', limitarLogin, async (req, res) => {
    const { email, senha } = loginSchema.parse(req.body)
    const usuario = await prisma.usuario.findUnique({ where: { email } })

    const senhaOk = await verificarSenha(senha, usuario?.senhaHash ?? (await HASH_FICTICIO))
    if (!usuario || !senhaOk || !usuario.ativo) {
      throw new ErroHttp(401, 'E-mail ou senha incorretos', 'CREDENCIAIS_INVALIDAS')
    }

    const tokens = await abrirSessao(req, res, usuario)
    res.json({ usuario: await usuarioPublico(usuario), tokens })
  })

  /**
   * Esqueci a senha: envia um código ao e-mail, se ele tiver conta. A resposta é sempre
   * a mesma, para não revelar quais e-mails estão cadastrados.
   */
  router.post('/esqueci-senha', limitarRecuperacao, async (req, res) => {
    const { email } = z.object({ email: emailSchema }).parse(req.body)
    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (usuario?.ativo) {
      await enviarCodigoEmail(usuario, 'REDEFINIR_SENHA').catch((erro) => {
        // Pedido repetido em menos de 1 minuto: o código anterior continua valendo
        if (!(erro instanceof ErroHttp && erro.codigo === 'AGUARDE_REENVIO')) throw erro
      })
    }
    res.status(204).end()
  })

  /** Cria a nova senha com o código recebido; encerra as sessões abertas em outros aparelhos. */
  router.post('/redefinir-senha', limitarRedefinicao, async (req, res) => {
    const { email, codigo, novaSenha } = redefinirSchema.parse(req.body)
    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario?.ativo) {
      throw new ErroHttp(
        400,
        'Código inválido ou expirado. Peça um novo código.',
        'CODIGO_INVALIDO',
      )
    }
    await validarCodigoEmail(usuario.id, 'REDEFINIR_SENHA', codigo)

    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        senhaHash: await gerarHashSenha(novaSenha),
        // Quem recebeu o código no e-mail comprovou que o e-mail é dela
        emailVerificadoEm: usuario.emailVerificadoEm ?? new Date(),
      },
    })
    await revogarTodasAsSessoes(usuario.id)
    res.status(204).end()
  })

  router.post('/refresh', async (req, res) => {
    const refresh = refreshDaRequisicao(req)
    const sessao = refresh ? await buscarSessaoValida(refresh) : null
    if (!sessao) {
      limparCookies(res)
      throw new ErroHttp(401, 'Sessão expirada', 'SESSAO_EXPIRADA')
    }

    // Rotação: o refresh token usado é revogado e um novo é emitido
    await revogarSessao(sessao.id)
    const tokens = await abrirSessao(req, res, sessao.usuario)
    res.json({ usuario: await usuarioPublico(sessao.usuario), tokens })
  })

  router.post('/logout', async (req, res) => {
    const refresh = refreshDaRequisicao(req)
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
      data: { senhaHash: await gerarHashSenha(novaSenha) },
    })

    // Encerra as outras sessões (ex.: outro celular) e abre uma nova para este dispositivo
    await revogarTodasAsSessoes(usuario.id)
    const tokens = await abrirSessao(req, res, atualizado)
    res.json({ usuario: await usuarioPublico(atualizado), tokens })
  })

  /**
   * Exclui a própria conta (exigência da Google Play). Pede a senha para evitar exclusão
   * acidental ou por quem pegou o celular desbloqueado.
   *  - Pessoa: apaga os PRs dela; exercícios criados por ela e usados por alunos ficam como histórico.
   *  - Academia: desfaz todos os vínculos, turmas e códigos; os PRs continuam com os alunos.
   */
  router.post('/excluir-conta', autenticar, async (req, res) => {
    const { senha } = excluirContaSchema.parse(req.body)
    const usuario = req.usuario!

    if (!(await verificarSenha(senha, usuario.senhaHash))) {
      throw new ErroHttp(400, 'Senha incorreta', 'SENHA_INCORRETA')
    }

    await prisma.usuario.delete({ where: { id: usuario.id } })
    limparCookies(res)
    res.status(204).end()
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
