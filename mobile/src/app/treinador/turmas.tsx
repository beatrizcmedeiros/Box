import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela } from '../../components/ui'
import { api, ErroApi, gestao } from '../../lib/api'
import { Chips } from '../../components/seletores'
import { useLocais, useTurmas } from '../../lib/consultasTreinador'
import { useContexto } from '../../lib/contexto'
import { cores } from '../../lib/tema'
import type { Local, Turma } from '../../lib/tipos'

/**
 * Turmas do contexto (nome e horário). Em "Meus alunos", ficam dentro de um local do
 * professor. Remover uma turma deixa os alunos sem turma (continuam vinculados).
 */
export default function Turmas() {
  const turmas = useTurmas()
  const locais = useLocais()
  const pessoal = useContexto().contexto.tipo === 'professor'
  const [editando, setEditando] = useState<Turma | 'nova' | null>(null)
  const semLocal = pessoal && (locais.data?.length ?? 0) === 0

  return (
    <Tela atualizar={{ atualizando: turmas.isRefetching, aoPuxar: () => turmas.refetch() }}>
      {pessoal && <Locais locais={locais.data ?? []} />}
      {editando ? (
        <FormularioTurma
          key={editando === 'nova' ? 'nova' : editando.id}
          turma={editando === 'nova' ? undefined : editando}
          locais={pessoal ? (locais.data ?? []) : null}
          aoFechar={() => setEditando(null)}
        />
      ) : (
        <Botao aoPressionar={() => setEditando('nova')} desabilitado={semLocal}>
          + Nova turma
        </Botao>
      )}
      {semLocal && (
        <Text style={{ fontSize: 13, color: cores.textoSuave }}>
          Crie um local antes (ex.: o nome da academia onde você dá aula).
        </Text>
      )}

      {turmas.isPending ? (
        <Carregando />
      ) : turmas.error ? (
        <Alerta>{turmas.error.message}</Alerta>
      ) : turmas.data.length === 0 ? (
        <Cartao>
          <Text style={{ color: cores.textoSuave, textAlign: 'center' }}>
            Nenhuma turma cadastrada.
          </Text>
        </Cartao>
      ) : (
        <Cartao estilo={{ paddingVertical: 4 }}>
          {turmas.data.map((t, i) => (
            <View
              key={t.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: cores.cinzaClaro,
              }}
            >
              <View>
                <Text style={{ fontSize: 15, fontWeight: '600', color: cores.texto }}>
                  {t.local ? `${t.local.nome} · ` : ''}
                  {t.nome}
                </Text>
                <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                  {t.horario ? `${t.horario} · ` : ''}
                  {t.totalAlunos} aluno(s)
                </Text>
              </View>
              <Botao variante="link" aoPressionar={() => setEditando(t)}>
                Editar
              </Botao>
            </View>
          ))}
        </Cartao>
      )}
    </Tela>
  )
}

function FormularioTurma({
  turma,
  locais,
  aoFechar,
}: {
  turma?: Turma
  /** Locais do professor ("Meus alunos"); null na academia */
  locais: Local[] | null
  aoFechar: () => void
}) {
  const cliente = useQueryClient()
  const [nome, setNome] = useState(turma?.nome ?? '')
  const [horario, setHorario] = useState(turma?.horario ?? '')
  const [localId, setLocalId] = useState<number | null>(turma?.local?.id ?? locais?.[0]?.id ?? null)

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['turmas'] })
    cliente.invalidateQueries({ queryKey: ['alunos'] })
    cliente.invalidateQueries({ queryKey: ['locais'] })
    aoFechar()
  }

  const salvar = useMutation({
    mutationFn: () => {
      const corpo = { nome, horario: horario.trim() || null, ...(locais ? { localId } : {}) }
      return turma
        ? api<Turma>(gestao(`/turmas/${turma.id}`), { method: 'PUT', body: corpo })
        : api<Turma>(gestao('/turmas'), { method: 'POST', body: corpo })
    },
    onSuccess: atualizar,
  })

  const remover = useMutation({
    mutationFn: () => api<void>(gestao(`/turmas/${turma!.id}`), { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  return (
    <Cartao estilo={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>
        {turma ? 'Editar turma' : 'Nova turma'}
      </Text>
      <Campo rotulo="Nome" value={nome} onChangeText={setNome} erro={erro?.doCampo('nome')} />
      {locais && (
        <Chips
          rotulo="Local"
          opcoes={locais.map((l) => ({ valor: l.id, rotulo: l.nome }))}
          valor={localId}
          aoEscolher={setLocalId}
        />
      )}
      <Campo
        rotulo="Horário (opcional)"
        value={horario}
        onChangeText={(t) => {
          const d = t.replace(/\D/g, '').slice(0, 4)
          setHorario(d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d)
        }}
        keyboardType="number-pad"
        placeholder="HH:MM"
        maxLength={5}
        erro={erro?.doCampo('horario')}
      />
      {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
      {remover.error && <Alerta>{remover.error.message}</Alerta>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Botao variante="secundario" aoPressionar={aoFechar} estilo={{ flex: 1 }}>
          Cancelar
        </Botao>
        <Botao
          aoPressionar={() => salvar.mutate()}
          precisaInternet
          carregando={salvar.isPending}
          estilo={{ flex: 1 }}
        >
          Salvar
        </Botao>
      </View>
      {turma && (
        <Botao
          variante="link"
          carregando={remover.isPending}
          aoPressionar={() =>
            Alert.alert(
              'Remover turma',
              `Remover a turma ${turma.nome}? Os ${turma.totalAlunos} aluno(s) dela ficam sem turma (não são apagados).`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Remover', style: 'destructive', onPress: () => remover.mutate() },
              ],
            )
          }
        >
          Remover turma
        </Botao>
      )}
    </Cartao>
  )
}

/** Locais do professor: agrupam turmas (ex.: "Academia X" com as turmas 07h e 19h). */
function Locais({ locais }: { locais: Local[] }) {
  const cliente = useQueryClient()
  const [nome, setNome] = useState('')
  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['locais'] })
    cliente.invalidateQueries({ queryKey: ['turmas'] })
    cliente.invalidateQueries({ queryKey: ['alunos'] })
  }
  const criar = useMutation({
    mutationFn: () => api<Local>('/professor/locais', { method: 'POST', body: { nome } }),
    onSuccess: () => {
      setNome('')
      atualizar()
    },
  })
  const excluir = useMutation({
    mutationFn: (id: number) => api<void>(`/professor/locais/${id}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })
  const erro = criar.error ?? excluir.error

  return (
    <Cartao estilo={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>Locais</Text>
      {locais.map((l) => (
        <View
          key={l.id}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: '600', color: cores.texto }}>{l.nome}</Text>
          <Botao
            variante="link"
            precisaInternet
            aoPressionar={() =>
              Alert.alert(
                'Excluir local',
                `Excluir ${l.nome}? As turmas dele são removidas; os alunos continuam vinculados.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Excluir', style: 'destructive', onPress: () => excluir.mutate(l.id) },
                ],
              )
            }
          >
            Excluir
          </Botao>
        </View>
      ))}
      <Campo
        rotulo="Novo local"
        placeholder="Ex.: Academia X"
        value={nome}
        onChangeText={setNome}
      />
      {erro && <Alerta>{erro.message}</Alerta>}
      <Botao
        variante="secundario"
        aoPressionar={() => criar.mutate()}
        carregando={criar.isPending}
        desabilitado={!nome.trim()}
        precisaInternet
      >
        Adicionar local
      </Botao>
    </Cartao>
  )
}
