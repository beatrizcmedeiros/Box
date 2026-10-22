import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Alerta, Botao, Campo, Tela } from '../components/ui'
import { ErroApi } from '../lib/api'
import { useCadastro } from '../lib/sessao'
import { cores } from '../lib/tema'

type TipoCadastro = 'aluno' | 'professor' | 'academia'

const opcoes: { valor: TipoCadastro; titulo: string; descricao: string }[] = [
  { valor: 'aluno', titulo: 'Aluno', descricao: 'Registro meus PRs e vejo minhas cargas' },
  {
    valor: 'professor',
    titulo: 'Professor',
    descricao: 'Acompanho meus alunos (e também registro meus PRs)',
  },
  {
    valor: 'academia',
    titulo: 'Academia',
    descricao: 'Conta do box: professores, turmas e alunos',
  },
]

/** Cadastro aberto: e-mail e senha. Depois vêm a confirmação do e-mail e o termo. */
export default function Cadastro() {
  const cadastro = useCadastro()
  const [tipo, setTipo] = useState<TipoCadastro>('aluno')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroConfirmacao, setErroConfirmacao] = useState<string>()
  const erro = cadastro.error instanceof ErroApi ? cadastro.error : null

  function criar() {
    if (senha !== confirmacao) {
      setErroConfirmacao('As senhas não conferem')
      return
    }
    setErroConfirmacao(undefined)
    // Depois do cadastro, as regras de acesso do _layout levam à confirmação do e-mail
    cadastro.mutate({
      nome: nome.trim(),
      email: email.trim(),
      senha,
      tipo: tipo === 'academia' ? 'ACADEMIA' : 'PESSOA',
      ehProfessor: tipo === 'professor',
    })
  }

  return (
    <Tela>
      <Text style={{ fontSize: 14, fontWeight: '600', color: cores.texto }}>Eu sou</Text>
      {opcoes.map((o) => {
        const ativo = o.valor === tipo
        return (
          <Pressable
            key={o.valor}
            accessibilityRole="radio"
            accessibilityState={{ selected: ativo }}
            onPress={() => setTipo(o.valor)}
            style={{
              borderWidth: 1,
              borderColor: ativo ? cores.marcaForte : '#cbd5e1',
              backgroundColor: ativo ? cores.marcaClara : cores.branco,
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ fontWeight: '700', color: cores.texto }}>{o.titulo}</Text>
            <Text style={{ fontSize: 13, color: cores.textoSuave }}>{o.descricao}</Text>
          </Pressable>
        )
      })}
      <View style={{ height: 4 }} />
      <Campo
        rotulo={tipo === 'academia' ? 'Nome da academia' : 'Seu nome'}
        value={nome}
        onChangeText={setNome}
        autoCapitalize="words"
        erro={erro?.doCampo('nome')}
      />
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        erro={
          erro?.doCampo('email') ?? (erro?.codigo === 'EMAIL_EM_USO' ? erro.message : undefined)
        }
      />
      <Campo
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoComplete="new-password"
        dica="Mínimo de 8 caracteres"
        erro={erro?.doCampo('senha')}
      />
      <Campo
        rotulo="Confirme a senha"
        value={confirmacao}
        onChangeText={setConfirmacao}
        secureTextEntry
        autoComplete="new-password"
        erro={erroConfirmacao}
      />
      {erro && erro.campos.length === 0 && erro.codigo !== 'EMAIL_EM_USO' && (
        <Alerta>{erro.message}</Alerta>
      )}
      <Botao aoPressionar={criar} carregando={cadastro.isPending} precisaInternet>
        Criar conta
      </Botao>
    </Tela>
  )
}
