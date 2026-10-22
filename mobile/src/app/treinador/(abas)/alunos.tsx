import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Busca, Chips, Etiqueta, opcoesTurma } from '../../../components/seletores'
import { Alerta, Botao, Cartao, Carregando, Tela } from '../../../components/ui'
import { useAlunos, useAtrasado, useLocais, useTurmas } from '../../../lib/consultasTreinador'
import { useContexto } from '../../../lib/contexto'
import { cores } from '../../../lib/tema'

/**
 * Alunos vinculados ao contexto. Cada aluno cria a própria conta e se vincula pelo código;
 * aqui o professor organiza (turma, local, apelidos) e pode desvincular.
 */
export default function Alunos() {
  const { contexto } = useContexto()
  const pessoal = contexto.tipo === 'professor'
  const turmas = useTurmas()
  const locais = useLocais()
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [localId, setLocalId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useAtrasado(busca.trim())
  const alunos = useAlunos({ busca: buscaAtrasada, turmaId, localId })

  return (
    <Tela atualizar={{ atualizando: alunos.isRefetching, aoPuxar: () => alunos.refetch() }}>
      <Text style={{ color: cores.textoSuave }}>
        {pessoal
          ? 'Alunos vinculados diretamente a você. Só você vê os PRs deles.'
          : `Alunos vinculados a ${contexto.nome}.`}
      </Text>
      <Botao variante="secundario" aoPressionar={() => router.push('/treinador/codigos')}>
        Código para os alunos se vincularem
      </Botao>
      <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome ou e-mail" />
      {pessoal && (locais.data?.length ?? 0) > 0 && (
        <Chips
          opcoes={[
            { valor: null, rotulo: 'Todos os locais' },
            ...(locais.data ?? []).map((l) => ({ valor: l.id, rotulo: l.nome })),
          ]}
          valor={localId}
          aoEscolher={setLocalId}
        />
      )}
      <Chips opcoes={opcoesTurma(turmas.data)} valor={turmaId} aoEscolher={setTurmaId} />

      {alunos.isPending ? (
        <Carregando />
      ) : alunos.error ? (
        <Alerta>{alunos.error.message}</Alerta>
      ) : alunos.data.length === 0 ? (
        <Cartao>
          <Text style={{ color: cores.textoSuave, textAlign: 'center' }}>
            Nenhum aluno vinculado. Gere um código e passe para os alunos: eles digitam o código no
            app, em Vínculos.
          </Text>
        </Cartao>
      ) : (
        <Cartao estilo={{ paddingVertical: 4 }}>
          {alunos.data.map((a, i) => (
            <Pressable
              key={a.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: '/treinador/aluno', params: { id: String(a.id) } })
              }
              style={({ pressed }) => ({
                paddingVertical: 10,
                gap: 4,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: cores.cinzaClaro,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: cores.texto }}>{a.nome}</Text>
              <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                {a.email}
                {[a.local?.nome, a.turma?.nome].filter(Boolean).length > 0
                  ? ` · ${[a.local?.nome, a.turma?.nome].filter(Boolean).join(' · ')}`
                  : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {a.primeiroAcessoPendente && <Etiqueta cor="amarelo">Sem 1º acesso</Etiqueta>}
                {a.apelidos.length > 0 && (
                  <Etiqueta>{`Apelidos: ${a.apelidos.join(', ')}`}</Etiqueta>
                )}
              </View>
            </Pressable>
          ))}
        </Cartao>
      )}
    </Tela>
  )
}
