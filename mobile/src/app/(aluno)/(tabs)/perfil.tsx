import { useState } from 'react'
import { router } from 'expo-router'
import { Modal, Switch, Text, View } from 'react-native'
import { Alerta, Botao, Campo, Cartao, Tela, Titulo } from '../../../components/ui'
import { ErroApi } from '../../../lib/api'
import {
  useExcluirConta,
  useLogout,
  useSouProfessor,
  useTrocarSenha,
  useUsuario,
} from '../../../lib/sessao'
import { cores } from '../../../lib/tema'

export default function Perfil() {
  const { data: usuario } = useUsuario()
  const logout = useLogout()

  return (
    <Tela>
      <Cartao estilo={{ gap: 12 }}>
        <Dado rotulo="Nome" valor={usuario?.nome} />
        <Dado rotulo="E-mail" valor={usuario?.email} />
      </Cartao>
      <SouProfessor />
      <TrocarSenha />
      {logout.error && <Alerta>Sem conexão: para sair da conta, conecte-se à internet.</Alerta>}
      <Botao
        variante="secundario"
        aoPressionar={() => logout.mutate()}
        carregando={logout.isPending}
      >
        Sair
      </Botao>
      <ExcluirConta />
    </Tela>
  )
}

function Dado({ rotulo, valor }: { rotulo: string; valor?: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Titulo>{rotulo}</Titulo>
      <Text style={{ fontSize: 16, color: cores.texto }}>{valor}</Text>
    </View>
  )
}

function TrocarSenha() {
  const trocar = useTrocarSenha()
  const [aberto, setAberto] = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const erro = trocar.error instanceof ErroApi ? trocar.error : null

  function salvar() {
    trocar.mutate(
      { senhaAtual, novaSenha },
      {
        onSuccess: () => {
          setSenhaAtual('')
          setNovaSenha('')
          setAberto(false)
        },
      },
    )
  }

  if (!aberto) {
    return (
      <View style={{ gap: 12 }}>
        {trocar.isSuccess && <Alerta tipo="sucesso">Senha alterada.</Alerta>}
        <Botao variante="secundario" aoPressionar={() => setAberto(true)}>
          Trocar senha
        </Botao>
      </View>
    )
  }

  return (
    <Cartao estilo={{ gap: 12 }}>
      <Campo
        rotulo="Senha atual"
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
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Botao variante="secundario" aoPressionar={() => setAberto(false)} estilo={{ flex: 1 }}>
          Cancelar
        </Botao>
        <Botao
          aoPressionar={salvar}
          precisaInternet
          carregando={trocar.isPending}
          estilo={{ flex: 1 }}
        >
          Salvar
        </Botao>
      </View>
    </Cartao>
  )
}

/** Exclusão definitiva da conta, exigida pela Google Play para apps com login. */
function ExcluirConta() {
  const excluir = useExcluirConta()
  const [aberto, setAberto] = useState(false)
  const [senha, setSenha] = useState('')
  const erro = excluir.error instanceof ErroApi ? excluir.error : null
  const erroSenha =
    erro?.doCampo('senha') ?? (erro?.codigo === 'SENHA_INCORRETA' ? erro.message : undefined)

  function fechar() {
    setAberto(false)
    setSenha('')
    excluir.reset()
  }

  return (
    <>
      <Botao variante="link" aoPressionar={() => setAberto(true)}>
        Excluir minha conta
      </Botao>
      <Modal visible={aberto} transparent animationType="slide" onRequestClose={fechar}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View
            style={{
              backgroundColor: cores.branco,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 20,
              gap: 14,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto }}>
              Excluir minha conta
            </Text>
            <Alerta>
              Sua conta, seus PRs e todo o histórico de testes serão apagados definitivamente. Isso
              não pode ser desfeito.
            </Alerta>
            <Campo
              rotulo="Confirme com sua senha"
              value={senha}
              onChangeText={setSenha}
              secureTextEntry
              autoComplete="current-password"
              erro={erroSenha}
            />
            {erro && !erroSenha && <Alerta>{erro.message}</Alerta>}
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Botao variante="secundario" aoPressionar={fechar} estilo={{ flex: 1 }}>
                Cancelar
              </Botao>
              <Botao
                variante="perigo"
                aoPressionar={() => excluir.mutate({ senha })}
                precisaInternet
                carregando={excluir.isPending}
                desabilitado={!senha}
                estilo={{ flex: 1 }}
              >
                Excluir
              </Botao>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

/** "Sou professor": ativa a área de gestão (alunos, turmas, códigos) na mesma conta. */
function SouProfessor() {
  const { data: usuario } = useUsuario()
  const alterar = useSouProfessor()
  if (!usuario) return null
  return (
    <Cartao estilo={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', color: cores.texto }}>Sou professor</Text>
          <Text style={{ fontSize: 13, color: cores.textoSuave }}>
            Acompanhe os seus alunos com a mesma conta
          </Text>
        </View>
        <Switch
          accessibilityLabel="Sou professor"
          value={usuario.ehProfessor}
          disabled={alterar.isPending}
          onValueChange={(v) => alterar.mutate(v)}
          trackColor={{ true: cores.marca }}
        />
      </View>
      {usuario.ehProfessor && (
        <Botao variante="secundario" aoPressionar={() => router.push('/treinador')}>
          Ir para a área do professor
        </Botao>
      )}
      {alterar.error && <Alerta>{alterar.error.message}</Alerta>}
    </Cartao>
  )
}
