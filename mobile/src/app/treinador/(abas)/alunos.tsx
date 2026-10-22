import { router } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Busca, Chips, Etiqueta, opcoesTurma } from '../../../components/seletores'
import { Alerta, Botao, Cartao, Carregando, Tela } from '../../../components/ui'
import { useAlunos, useAtrasado, useTurmas } from '../../../lib/consultasTreinador'
import { cores } from '../../../lib/tema'

/** Alunos do box: cadastro, edição, senha temporária e desativação. */
export default function Alunos() {
  const turmas = useTurmas()
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useAtrasado(busca.trim())
  const alunos = useAlunos({ busca: buscaAtrasada, turmaId })

  return (
    <Tela atualizar={{ atualizando: alunos.isRefetching, aoPuxar: () => alunos.refetch() }}>
      <Botao aoPressionar={() => router.push('/treinador/aluno')}>+ Cadastrar aluno</Botao>
      <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar por nome ou e-mail" />
      <Chips opcoes={opcoesTurma(turmas.data)} valor={turmaId} aoEscolher={setTurmaId} />

      {alunos.isPending ? (
        <Carregando />
      ) : alunos.error ? (
        <Alerta>{alunos.error.message}</Alerta>
      ) : alunos.data.length === 0 ? (
        <Cartao>
          <Text style={{ color: cores.textoSuave, textAlign: 'center' }}>
            Nenhum aluno encontrado.
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
                {a.turma ? ` · ${a.turma.nome}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {!a.ativo && <Etiqueta cor="vermelho">Inativo</Etiqueta>}
                {a.ativo && a.trocarSenha && <Etiqueta cor="amarelo">Sem 1º acesso</Etiqueta>}
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
