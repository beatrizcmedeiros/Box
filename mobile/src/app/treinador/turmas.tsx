import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela } from '../../components/ui'
import { api, ErroApi } from '../../lib/api'
import { useTurmas } from '../../lib/consultasTreinador'
import { cores } from '../../lib/tema'
import type { Turma } from '../../lib/tipos'

/** Turmas do box (nome e horário). Remover uma turma deixa os alunos sem turma. */
export default function Turmas() {
  const turmas = useTurmas()
  const [editando, setEditando] = useState<Turma | 'nova' | null>(null)

  return (
    <Tela atualizar={{ atualizando: turmas.isRefetching, aoPuxar: () => turmas.refetch() }}>
      {editando ? (
        <FormularioTurma
          key={editando === 'nova' ? 'nova' : editando.id}
          turma={editando === 'nova' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      ) : (
        <Botao aoPressionar={() => setEditando('nova')}>+ Nova turma</Botao>
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

function FormularioTurma({ turma, aoFechar }: { turma?: Turma; aoFechar: () => void }) {
  const cliente = useQueryClient()
  const [nome, setNome] = useState(turma?.nome ?? '')
  const [horario, setHorario] = useState(turma?.horario ?? '')

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['turmas'] })
    cliente.invalidateQueries({ queryKey: ['alunos'] })
    aoFechar()
  }

  const salvar = useMutation({
    mutationFn: () => {
      const corpo = { nome, horario: horario.trim() || null }
      return turma
        ? api<Turma>(`/admin/turmas/${turma.id}`, { method: 'PUT', body: corpo })
        : api<Turma>('/admin/turmas', { method: 'POST', body: corpo })
    },
    onSuccess: atualizar,
  })

  const remover = useMutation({
    mutationFn: () => api<void>(`/admin/turmas/${turma!.id}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  return (
    <Cartao estilo={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>
        {turma ? 'Editar turma' : 'Nova turma'}
      </Text>
      <Campo rotulo="Nome" value={nome} onChangeText={setNome} erro={erro?.doCampo('nome')} />
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
