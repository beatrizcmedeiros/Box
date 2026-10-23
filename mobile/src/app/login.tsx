import { router } from 'expo-router'
import { useState } from 'react'
import { Text } from 'react-native'
import { Alerta, Botao, Campo, TelaPublica } from '../components/ui'
import { ErroApi } from '../lib/api'
import { useLogin } from '../lib/sessao'
import { cores } from '../lib/tema'
import { LinkPrivacidade } from '../components/LinkPrivacidade'

export default function Login() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const erro = login.error instanceof ErroApi ? login.error : null

  // Depois do login, as regras de acesso do _layout levam cada conta para a sua área
  const entrar = () => login.mutate({ email: email.trim(), senha })

  return (
    <TelaPublica subtitulo="Seus recordes e cargas de treino sempre à mão">
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
        returnKeyType="next"
        erro={erro?.doCampo('email')}
      />
      <Campo
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={entrar}
        erro={erro?.doCampo('senha')}
      />
      {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
      <Botao aoPressionar={entrar} precisaInternet carregando={login.isPending}>
        Entrar
      </Botao>
      <Botao variante="link" aoPressionar={() => router.push('/esqueci-senha')}>
        Esqueci a senha
      </Botao>
      <Text style={{ textAlign: 'center', color: cores.textoSuave, fontSize: 14 }}>
        Ainda não tem conta?
      </Text>
      <Botao variante="secundario" aoPressionar={() => router.push('/cadastro')}>
        Criar conta
      </Botao>
      <LinkPrivacidade />
    </TelaPublica>
  )
}
