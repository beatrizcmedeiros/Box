import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Switch, Text, View } from 'react-native'
import { Chips } from '../../components/seletores'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela, Titulo } from '../../components/ui'
import { api, ErroApi } from '../../lib/api'
import { useAlunos, useTurmas } from '../../lib/consultasTreinador'
import { cores } from '../../lib/tema'
import type { Aluno } from '../../lib/tipos'

/** Cadastro (sem id) ou edição (com id) de um aluno. */
export default function FormularioAluno() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const alunos = useAlunos({})

  if (!id) return <Formulario />
  if (alunos.isPending) return <Carregando />
  const aluno = alunos.data?.find((a) => a.id === Number(id))
  if (!aluno) {
    return (
      <Tela>
        <Alerta>{alunos.error?.message ?? 'Aluno não encontrado.'}</Alerta>
      </Tela>
    )
  }
  return <Formulario aluno={aluno} />
}

/** No cadastro, a API devolve também a senha temporária. */
type RespostaSalvar = { aluno: Aluno; senhaTemporaria?: string }

/** Mostra a senha temporária uma única vez, como na versão web. */
function avisarSenhaTemporaria(nome: string, senha: string) {
  Alert.alert(
    'Senha temporária',
    `Passe esta senha para ${nome.split(' ')[0]}. Ela não será mostrada de novo:\n\n${senha}\n\nNo primeiro acesso, o aluno cria uma senha pessoal.`,
    [{ text: 'Anotei' }],
  )
}

function Formulario({ aluno }: { aluno?: Aluno }) {
  const cliente = useQueryClient()
  const turmas = useTurmas()
  const [nome, setNome] = useState(aluno?.nome ?? '')
  const [email, setEmail] = useState(aluno?.email ?? '')
  const [turmaId, setTurmaId] = useState<number | null>(aluno?.turma?.id ?? null)
  const [apelidos, setApelidos] = useState(aluno?.apelidos.join(', ') ?? '')
  const [ativo, setAtivo] = useState(aluno?.ativo ?? true)

  const atualizarListas = () => {
    for (const chave of [
      'alunos',
      'turmas',
      'visao-geral',
      'lancamentos',
      'cargas',
      'percentuais',
    ]) {
      cliente.invalidateQueries({ queryKey: [chave] })
    }
  }

  const salvar = useMutation({
    mutationFn: async (): Promise<RespostaSalvar> => {
      const corpo = {
        nome,
        email,
        turmaId,
        ativo,
        apelidos: apelidos
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      }
      if (aluno) {
        return {
          aluno: await api<Aluno>(`/admin/alunos/${aluno.id}`, { method: 'PUT', body: corpo }),
        }
      }
      return api<RespostaSalvar>('/admin/alunos', { method: 'POST', body: corpo })
    },
    onSuccess: (resposta) => {
      atualizarListas()
      if (resposta.senhaTemporaria) {
        avisarSenhaTemporaria(resposta.aluno.nome, resposta.senhaTemporaria)
      }
      router.back()
    },
  })

  const redefinir = useMutation({
    mutationFn: () =>
      api<{ senhaTemporaria: string }>(`/admin/alunos/${aluno!.id}/redefinir-senha`, {
        method: 'POST',
      }),
    onSuccess: ({ senhaTemporaria }) => {
      atualizarListas()
      avisarSenhaTemporaria(aluno!.nome, senhaTemporaria)
    },
  })

  const excluir = useMutation({
    mutationFn: () => api<void>(`/admin/alunos/${aluno!.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      atualizarListas()
      router.back()
    },
  })

  const confirmar = (titulo: string, mensagem: string, acao: string, aoConfirmar: () => void) =>
    Alert.alert(titulo, mensagem, [
      { text: 'Cancelar', style: 'cancel' },
      { text: acao, style: 'destructive', onPress: aoConfirmar },
    ])

  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  return (
    <Tela>
      <Stack.Screen options={{ title: aluno ? 'Editar aluno' : 'Novo aluno' }} />
      <Cartao estilo={{ gap: 14 }}>
        <Campo
          rotulo="Nome completo"
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
          keyboardType="email-address"
          erro={erro?.doCampo('email')}
        />
        <Chips
          rotulo="Turma"
          opcoes={[
            { valor: null, rotulo: 'Sem turma' },
            ...(turmas.data ?? []).map((t) => ({ valor: t.id, rotulo: t.nome })),
          ]}
          valor={turmaId}
          aoEscolher={setTurmaId}
        />
        <Campo
          rotulo="Apelidos (separados por vírgula)"
          value={apelidos}
          onChangeText={setApelidos}
          dica="Como o aluno aparece na lista do teste (ex.: Lurdinha)"
          erro={erro?.doCampo('apelidos')}
        />
        {aluno && (
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <View style={{ flexShrink: 1 }}>
              <Titulo>Ativo</Titulo>
              <Text style={{ fontSize: 13, color: cores.textoSuave }}>
                Alunos inativos não entram no app nem nas listas
              </Text>
            </View>
            <Switch
              accessibilityLabel="Aluno ativo"
              value={ativo}
              onValueChange={setAtivo}
              trackColor={{ true: cores.marca }}
            />
          </View>
        )}
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
        <Botao aoPressionar={() => salvar.mutate()} precisaInternet carregando={salvar.isPending}>
          {aluno ? 'Salvar alterações' : 'Cadastrar e gerar senha'}
        </Botao>
      </Cartao>

      {aluno && (
        <Cartao estilo={{ gap: 10 }}>
          <Text style={{ color: cores.textoSuave, fontSize: 13 }}>
            Esqueceu a senha? Gere uma nova senha temporária. As sessões abertas do aluno serão
            encerradas.
          </Text>
          {redefinir.error && <Alerta>{redefinir.error.message}</Alerta>}
          <Botao
            variante="secundario"
            carregando={redefinir.isPending}
            aoPressionar={() =>
              confirmar(
                'Nova senha temporária',
                `Gerar uma nova senha para ${aluno.nome}?`,
                'Gerar',
                () => redefinir.mutate(),
              )
            }
          >
            Gerar nova senha temporária
          </Botao>
          {excluir.error && <Alerta>{excluir.error.message}</Alerta>}
          <Botao
            variante="link"
            carregando={excluir.isPending}
            aoPressionar={() =>
              confirmar(
                'Excluir aluno',
                `Excluir ${aluno.nome} e todo o histórico de testes? Isso não pode ser desfeito. Para só impedir o acesso, desative o aluno.`,
                'Excluir',
                () => excluir.mutate(),
              )
            }
          >
            Excluir aluno
          </Botao>
        </Cartao>
      )}
    </Tela>
  )
}
