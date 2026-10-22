import { useState } from 'react'
import { Text } from 'react-native'
import { Alerta, Botao, Campo, TelaPublica } from '../components/ui'
import { ErroApi } from '../lib/api'
import { useLogin } from '../lib/sessao'
import { cores } from '../lib/tema'

export default function Login() {
  const login = useLogin()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const erro = login.error instanceof ErroApi ? login.error : null

  // Depois do login, as regras de acesso do _layout levam cada perfil para a sua tela
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
      <Botao aoPressionar={entrar} carregando={login.isPending}>
        Entrar
      </Botao>
      <Text style={{ textAlign: 'center', color: cores.textoSuave, fontSize: 14 }}>
        Esqueceu a senha? Peça ao seu treinador para gerar uma nova senha temporária.
      </Text>
    </TelaPublica>
  )
}
