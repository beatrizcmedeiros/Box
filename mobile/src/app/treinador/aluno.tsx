import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Text } from 'react-native'
import { PrsDoAluno } from '../../components/PrsDoAluno'
import { Chips } from '../../components/seletores'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela } from '../../components/ui'
import { api, ErroApi, gestao } from '../../lib/api'
import { useAlunos, useLocais, useTurmas } from '../../lib/consultasTreinador'
import { useContexto } from '../../lib/contexto'
import { cores } from '../../lib/tema'
import type { Aluno } from '../../lib/tipos'

/** Aluno vinculado: turma, local e apelidos neste contexto, os PRs dele (com edição) ou desvincular. */
export default function OrganizarAluno() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const alunos = useAlunos({})

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

function Formulario({ aluno }: { aluno: Aluno }) {
  const cliente = useQueryClient()
  const pessoal = useContexto().contexto.tipo === 'professor'
  const turmas = useTurmas()
  const locais = useLocais()
  const [turmaId, setTurmaId] = useState<number | null>(aluno.turma?.id ?? null)
  const [localId, setLocalId] = useState<number | null>(aluno.local?.id ?? null)
  const [apelidos, setApelidos] = useState(aluno.apelidos.join(', '))

  // No "Meus alunos", as turmas mostradas são as do local escolhido
  const turmasVisiveis = (turmas.data ?? []).filter(
    (t) => !pessoal || !localId || t.local?.id === localId,
  )

  const atualizarListas = () => {
    for (const chave of ['alunos', 'turmas', 'locais', 'visao-geral', 'lancamentos', 'cargas']) {
      cliente.invalidateQueries({ queryKey: [chave] })
    }
  }

  const salvar = useMutation({
    mutationFn: () =>
      api<Aluno>(gestao(`/alunos/${aluno.id}`), {
        method: 'PUT',
        body: {
          turmaId,
          localId: pessoal ? localId : null,
          apelidos: apelidos
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      atualizarListas()
      router.back()
    },
  })

  const desvincular = useMutation({
    mutationFn: () => api<void>(gestao(`/alunos/${aluno.id}`), { method: 'DELETE' }),
    onSuccess: () => {
      atualizarListas()
      router.back()
    },
  })

  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  return (
    <Tela>
      <Stack.Screen options={{ title: aluno.nome }} />
      <Cartao estilo={{ gap: 14 }}>
        <Text style={{ color: cores.textoSuave }}>{aluno.email}</Text>
        {pessoal && (
          <Chips
            rotulo="Local"
            opcoes={[
              { valor: null, rotulo: 'Sem local' },
              ...(locais.data ?? []).map((l) => ({ valor: l.id, rotulo: l.nome })),
            ]}
            valor={localId}
            aoEscolher={(v) => {
              setLocalId(v)
              setTurmaId(null)
            }}
          />
        )}
        <Chips
          rotulo="Turma"
          opcoes={[
            { valor: null, rotulo: 'Sem turma' },
            ...turmasVisiveis.map((t) => ({
              valor: t.id,
              rotulo: t.local && !localId ? `${t.local.nome} · ${t.nome}` : t.nome,
            })),
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
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
        <Botao aoPressionar={() => salvar.mutate()} carregando={salvar.isPending} precisaInternet>
          Salvar
        </Botao>
      </Cartao>

      <PrsDoAluno alunoId={aluno.id} />

      <Cartao estilo={{ gap: 8 }}>
        <Text style={{ fontSize: 13, color: cores.textoSuave }}>
          Desvincular: você deixa de ver os PRs deste aluno. A conta e os PRs continuam com ele.
        </Text>
        {desvincular.error && <Alerta>{desvincular.error.message}</Alerta>}
        <Botao
          variante="link"
          carregando={desvincular.isPending}
          precisaInternet
          aoPressionar={() =>
            Alert.alert('Desvincular aluno', `Desvincular ${aluno.nome}?`, [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Desvincular', style: 'destructive', onPress: () => desvincular.mutate() },
            ])
          }
        >
          Desvincular aluno
        </Botao>
      </Cartao>
    </Tela>
  )
}
