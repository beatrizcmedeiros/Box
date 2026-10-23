import { createTransport, type Transporter } from 'nodemailer'
import { ErroHttp } from '../lib/erros.ts'

export type Email = { para: string; assunto: string; texto: string; html: string }

/**
 * E-mails "enviados" quando não há serviço configurado (desenvolvimento e testes).
 * Os testes leem daqui o código enviado.
 */
export const caixaDeSaida: Email[] = []

/**
 * Serviço de envio configurado:
 *  - "resend": RESEND_API_KEY (https://resend.com). Sem domínio verificado, o Resend só
 *    entrega para o e-mail do dono da conta Resend.
 *  - "smtp": EMAIL_SMTP_USUARIO e EMAIL_SMTP_SENHA (ex.: Gmail com "senha de app"),
 *    com EMAIL_SMTP_HOST (padrão smtp.gmail.com) e EMAIL_SMTP_PORTA (padrão 465).
 *    Entrega para qualquer endereço, sem precisar de domínio próprio.
 */
export function provedorEmail(): 'resend' | 'smtp' | null {
  if (process.env.RESEND_API_KEY) return 'resend'
  if (process.env.EMAIL_SMTP_USUARIO && process.env.EMAIL_SMTP_SENHA) return 'smtp'
  return null
}

const remetente = () =>
  process.env.EMAIL_REMETENTE ??
  (provedorEmail() === 'smtp'
    ? `PR Box <${process.env.EMAIL_SMTP_USUARIO}>`
    : 'PR Box <onboarding@resend.dev>')

let transporteSmtp: Transporter | null = null
const smtp = () => {
  const porta = Number(process.env.EMAIL_SMTP_PORTA ?? 465)
  transporteSmtp ??= createTransport({
    host: process.env.EMAIL_SMTP_HOST ?? 'smtp.gmail.com',
    port: porta,
    secure: porta === 465,
    auth: { user: process.env.EMAIL_SMTP_USUARIO, pass: process.env.EMAIL_SMTP_SENHA },
  })
  return transporteSmtp
}

const falhaNoEnvio = () =>
  new ErroHttp(
    503,
    'Não foi possível enviar o e-mail agora. Tente de novo em instantes.',
    'EMAIL_FALHOU',
  )

/**
 * Envia um e-mail pelo serviço configurado. Sem serviço:
 *  - em desenvolvimento e testes, guarda na caixa de saída e mostra no terminal da API;
 *  - em produção, recusa (o cadastro não funciona sem envio de e-mail).
 */
export async function enviarEmail(email: Email) {
  const provedor = provedorEmail()

  if (!provedor) {
    if (process.env.NODE_ENV === 'production') {
      console.error('Envio de e-mails não configurado (RESEND_API_KEY ou EMAIL_SMTP_*).')
      throw new ErroHttp(
        503,
        'O envio de e-mails não está disponível no momento.',
        'EMAIL_INDISPONIVEL',
      )
    }
    caixaDeSaida.push(email)
    if (process.env.NODE_ENV !== 'test') {
      console.log(`
[e-mail para ${email.para}] ${email.assunto}
${email.texto}
`)
    }
    return
  }

  if (provedor === 'smtp') {
    try {
      await smtp().sendMail({
        from: remetente(),
        to: email.para,
        subject: email.assunto,
        text: email.texto,
        html: email.html,
      })
    } catch (erro) {
      console.error(`Falha ao enviar e-mail por SMTP: ${(erro as Error).message}`)
      throw falhaNoEnvio()
    }
    return
  }

  const resposta = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: remetente(),
      to: [email.para],
      subject: email.assunto,
      text: email.texto,
      html: email.html,
    }),
  }).catch(() => null)

  if (!resposta?.ok) {
    // O corpo da resposta do Resend explica o motivo (ex.: domínio não verificado)
    const motivo = resposta ? await resposta.text().catch(() => '') : 'sem resposta'
    console.error(`Falha ao enviar e-mail pelo Resend (${resposta?.status ?? '-'}): ${motivo}`)
    throw falhaNoEnvio()
  }
}

const escapar = (texto: string) =>
  texto.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

/** E-mail com o código de 6 dígitos (confirmação de e-mail ou nova senha). */
export function emailComCodigo(para: string, nome: string, codigo: string, finalidade: string) {
  const primeiroNome = nome.split(' ')[0]
  const assunto = `${codigo} é o seu código do PR Box`
  const texto = [
    `Olá, ${primeiroNome}!`,
    '',
    `Use o código ${codigo} para ${finalidade}.`,
    'Ele vale por 15 minutos.',
    '',
    'Se não foi você que pediu, ignore este e-mail.',
  ].join('\n')
  const html = `<div style="font-family:system-ui,sans-serif;max-width:420px;color:#0f172a">
  <p>Olá, ${escapar(primeiroNome)}!</p>
  <p>Use o código abaixo para ${escapar(finalidade)}:</p>
  <p style="font-size:32px;font-weight:800;letter-spacing:6px;margin:16px 0">${codigo}</p>
  <p style="color:#5a6b84">Ele vale por 15 minutos. Se não foi você que pediu, ignore este e-mail.</p>
</div>`
  return { para, assunto, texto, html }
}
