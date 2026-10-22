import { ErroHttp } from '../lib/erros.ts'

export type Email = { para: string; assunto: string; texto: string; html: string }

/**
 * E-mails "enviados" quando não há serviço configurado (desenvolvimento e testes).
 * Os testes leem daqui o código enviado.
 */
export const caixaDeSaida: Email[] = []

const configurado = () => !!process.env.RESEND_API_KEY

/**
 * Envia um e-mail pelo Resend (https://resend.com). Sem RESEND_API_KEY:
 *  - em desenvolvimento e testes, guarda na caixa de saída e mostra no terminal da API;
 *  - em produção, recusa (o cadastro não funciona sem envio de e-mail).
 */
export async function enviarEmail(email: Email) {
  if (!configurado()) {
    if (process.env.NODE_ENV === 'production') {
      console.error('RESEND_API_KEY não definida: não é possível enviar e-mails.')
      throw new ErroHttp(503, 'O envio de e-mails não está disponível no momento.')
    }
    caixaDeSaida.push(email)
    if (process.env.NODE_ENV !== 'test') {
      console.log(`\n[e-mail para ${email.para}] ${email.assunto}\n${email.texto}\n`)
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
      from: process.env.EMAIL_REMETENTE ?? 'PR Box <onboarding@resend.dev>',
      to: [email.para],
      subject: email.assunto,
      text: email.texto,
      html: email.html,
    }),
  }).catch(() => null)

  if (!resposta?.ok) {
    console.error(`Falha ao enviar e-mail (${resposta?.status ?? 'sem resposta'})`)
    throw new ErroHttp(503, 'Não foi possível enviar o e-mail agora. Tente de novo em instantes.')
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
