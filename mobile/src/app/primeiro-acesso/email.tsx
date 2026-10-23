import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alerta, Botao, Campo, TelaPublica } from '../../components/ui'
import { ErroApi } from '../../lib/api'
import {
  CHAVE_EMAIL_ENVIADO,
  useConfirmarEmail,
  useLogout,
  useReenviarConfirmacao,
  useUsuario,
} from '../../lib/sessao'

/** Primeiro acesso: digitar o código de 6 dígitos enviado ao e-mail no cadastro. */
export default function ConfirmarEmail() {
  const { data: usuario } = useUsuario()
  const confirmar = useConfirmarEmail()
  const reenviar = useReenviarConfirmacao()
  const logout = useLogout()
  const [codigo, setCodigo] = useState('')
  // false: no cadastro, a API não conseguiu enviar o código (ex.: envio de e-mail fora do ar)
  const emailEnviado = useQueryClient().getQueryData<boolean>(CHAVE_EMAIL_ENVIADO)
  const erro = confirmar.error instanceof ErroApi ? confirmar.error : null

  return (
    <TelaPublica subtitulo="Confirme o seu e-mail para continuar">
      {emailEnviado === false && !reenviar.isSuccess && (
        <Alerta>
          Não conseguimos enviar o código agora. Toque em Reenviar o código daqui a pouco. Se o
          problema continuar, avise o responsável pelo PR Box.
        </Alerta>
      )}
      <Alerta tipo="info">
        Enviamos um código de 6 dígitos para {usuario?.email}. Ele vale por 15 minutos. Confira
        também a caixa de spam.
      </Alerta>
      <Campo
        rotulo="Código"
        value={codigo}
        onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
        grande
        erro={
          erro?.doCampo('codigo') ?? (erro?.codigo === 'CODIGO_INVALIDO' ? erro.message : undefined)
        }
      />
      <Botao
        aoPressionar={() => confirmar.mutate(codigo)}
        carregando={confirmar.isPending}
        desabilitado={codigo.length !== 6}
        precisaInternet
      >
        Confirmar e-mail
      </Botao>
      {reenviar.isSuccess && <Alerta tipo="sucesso">Enviamos um novo código.</Alerta>}
      {reenviar.error && <Alerta>{reenviar.error.message}</Alerta>}
      <Botao
        variante="link"
        aoPressionar={() => reenviar.mutate()}
        carregando={reenviar.isPending}
        precisaInternet
      >
        Reenviar o código
      </Botao>
      <Botao variante="link" aoPressionar={() => logout.mutate()}>
        Sair
      </Botao>
    </TelaPublica>
  )
}
