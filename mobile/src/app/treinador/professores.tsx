import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Alert, Text, View } from 'react-native'
import { Alerta, Botao, Cartao, Carregando, Tela } from '../../components/ui'
import { api } from '../../lib/api'
import { formatarData } from '../../lib/formato'
import { cores } from '../../lib/tema'

type Professor = { id: number; nome: string; email: string; desde: string }

/** Professores da academia (só para a conta da academia). */
export default function Professores() {
  const cliente = useQueryClient()
  const professores = useQuery({
    queryKey: ['professores'],
    queryFn: () => api<Professor[]>('/academia/professores'),
  })
  const remover = useMutation({
    mutationFn: (id: number) => api<void>(`/academia/professores/${id}`, { method: 'DELETE' }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['professores'] }),
  })

  return (
    <Tela
      atualizar={{ atualizando: professores.isRefetching, aoPuxar: () => professores.refetch() }}
    >
      <Text style={{ color: cores.textoSuave }}>
        Os professores da academia veem todos os alunos e turmas dela.
      </Text>
      <Botao variante="secundario" aoPressionar={() => router.push('/treinador/codigos')}>
        Código para professores
      </Botao>
      {professores.isPending ? (
        <Carregando />
      ) : professores.error ? (
        <Alerta>{professores.error.message}</Alerta>
      ) : professores.data.length === 0 ? (
        <Cartao>
          <Text style={{ textAlign: 'center', color: cores.textoSuave }}>
            Nenhum professor ainda. Gere o código para professores e passe para eles.
          </Text>
        </Cartao>
      ) : (
        <Cartao estilo={{ paddingVertical: 4 }}>
          {remover.error && <Alerta>{remover.error.message}</Alerta>}
          {professores.data.map((p, i) => (
            <View
              key={p.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: cores.cinzaClaro,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: cores.texto }}>{p.nome}</Text>
                <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                  {p.email} · desde {formatarData(p.desde.slice(0, 10))}
                </Text>
              </View>
              <Botao
                variante="link"
                precisaInternet
                aoPressionar={() =>
                  Alert.alert(
                    'Remover professor',
                    `Remover ${p.nome}? Ele deixa de ver os alunos da academia.`,
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Remover',
                        style: 'destructive',
                        onPress: () => remover.mutate(p.id),
                      },
                    ],
                  )
                }
              >
                Remover
              </Botao>
            </View>
          ))}
        </Cartao>
      )}
    </Tela>
  )
}
