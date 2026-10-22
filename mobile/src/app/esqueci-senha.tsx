import { router } from 'expo-router'
import { useState } from 'react'
import { Text } from 'react-native'
import { Alerta, Botao, Campo, Tela } from '../components/ui'
import { ErroApi } from '../lib/api'
import { useEsqueciSenha, useRedefinirSenha } from '../lib/sessao'
import { cores } from '../lib/tema'

/** Esqueci a senha: código enviado ao e-mail e criação da nova senha. */
export default function EsqueciSenha() {
  const pedir = useEsqueciSenha()
  const redefinir = useRedefinirSenha()
  const [email, setEmail] = useState('')
  const [codigo, setCodigo] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const erro = redefinir.error instanceof ErroApi ? redefinir.error : null

  if (redefinir.isSuccess) {
    return (
      <Tela>
        <Alerta tipo="sucesso">
          Pronto! Sua senha foi alterada. Por segurança, os outros aparelhos conectados foram
          desconectados.
        </Alerta>
        <Botao aoPressionar={() => router.back()}>Entrar</Botao>
      </Tela>
    )
  }

  if (!pedir.isSuccess) {
    return (
      <Tela>
        <Text style={{ color: cores.textoSuave }}>
          Informe o e-mail da sua conta. Vamos enviar um código para você criar uma nova senha.
        </Text>
        <Campo
          rotulo="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
        />
        {pedir.error && <Alerta>{pedir.error.message}</Alerta>}
        <Botao
          aoPressionar={() => pedir.mutate(email.trim())}
          carregando={pedir.isPending}
          desabilitado={!email.trim()}
          precisaInternet
        >
          Enviar código
        </Botao>
      </Tela>
    )
  }

  return (
    <Tela>
      <Alerta tipo="info">
        Se houver uma conta com {email.trim()}, enviamos um código de 6 dígitos. Ele vale por 15
        minutos.
      </Alerta>
      <Campo
        rotulo="Código"
        value={codigo}
        onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        maxLength={6}
        erro={erro?.codigo === 'CODIGO_INVALIDO' ? erro.message : erro?.doCampo('codigo')}
      />
      <Campo
        rotulo="Nova senha"
        value={novaSenha}
        onChangeText={setNovaSenha}
        secureTextEntry
        autoComplete="new-password"
        dica="Mínimo de 8 caracteres"
        erro={erro?.doCampo('novaSenha')}
      />
      {erro && erro.campos.length === 0 && erro.codigo !== 'CODIGO_INVALIDO' && (
        <Alerta>{erro.message}</Alerta>
      )}
      <Botao
        aoPressionar={() => redefinir.mutate({ email: email.trim(), codigo, novaSenha })}
        carregando={redefinir.isPending}
        precisaInternet
      >
        Salvar nova senha
      </Botao>
      <Botao variante="link" aoPressionar={() => pedir.reset()}>
        Usar outro e-mail ou pedir outro código
      </Botao>
    </Tela>
  )
}
