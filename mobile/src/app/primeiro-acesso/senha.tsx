import { useState } from 'react'
import { Alerta, Botao, Campo, TelaPublica } from '../../components/ui'
import { ErroApi } from '../../lib/api'
import { useLogout, useTrocarSenha, useUsuario } from '../../lib/sessao'

/** Troca obrigatória da senha temporária criada pelo treinador. */
export default function TrocarSenhaTemporaria() {
  const { data: usuario } = useUsuario()
  const trocar = useTrocarSenha()
  const logout = useLogout()
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [erroConfirmacao, setErroConfirmacao] = useState<string>()
  const erro = trocar.error instanceof ErroApi ? trocar.error : null

  function salvar() {
    if (novaSenha !== confirmacao) {
      setErroConfirmacao('As senhas não conferem')
      return
    }
    setErroConfirmacao(undefined)
    trocar.mutate({ senhaAtual, novaSenha })
  }

  return (
    <TelaPublica subtitulo={`Olá, ${usuario?.nome.split(' ')[0]}! Crie sua senha para continuar.`}>
      <Alerta tipo="info">
        Você entrou com uma senha temporária. Escolha uma senha pessoal com pelo menos 8 caracteres.
      </Alerta>
      <Campo
        rotulo="Senha temporária"
        value={senhaAtual}
        onChangeText={setSenhaAtual}
        secureTextEntry
        autoComplete="current-password"
        erro={
          erro?.doCampo('senhaAtual') ??
          (erro?.codigo === 'SENHA_ATUAL_INCORRETA' ? erro.message : undefined)
        }
      />
      <Campo
        rotulo="Nova senha"
        value={novaSenha}
        onChangeText={setNovaSenha}
        secureTextEntry
        autoComplete="new-password"
        dica="Mínimo de 8 caracteres"
        erro={
          erro?.doCampo('novaSenha') ??
          (erro?.codigo === 'SENHA_REPETIDA' ? erro.message : undefined)
        }
      />
      <Campo
        rotulo="Confirme a nova senha"
        value={confirmacao}
        onChangeText={setConfirmacao}
        secureTextEntry
        autoComplete="new-password"
        erro={erroConfirmacao}
      />
      {erro && erro.campos.length === 0 && !erro.codigo?.startsWith('SENHA_') && (
        <Alerta>{erro.message}</Alerta>
      )}
      <Botao aoPressionar={salvar} carregando={trocar.isPending}>
        Salvar nova senha
      </Botao>
      <Botao variante="link" aoPressionar={() => logout.mutate()}>
        Sair
      </Botao>
    </TelaPublica>
  )
}
