import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Stack, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { BotaoRegistrar } from '../../../components/aluno'
import { EditarPr } from '../../../components/EditarPr'
import { SeletorBasePr } from '../../../components/SeletorBasePr'
import { Alerta, Botao, Cartao, Carregando, Tela, Titulo } from '../../../components/ui'
import { api, ErroApi } from '../../../lib/api'
import { rotuloBase, useBasePr } from '../../../lib/basePr'
import { useDetalhePr } from '../../../lib/consultas'
import { formatarData, formatarKg } from '../../../lib/formato'
import { cores } from '../../../lib/tema'
import type { Lancamento } from '../../../lib/tipos'

/** PR atual, cargas por percentual e histórico de testes de um exercício. */
export default function DetalheExercicio() {
  const params = useLocalSearchParams<{ id: string; salvo?: string }>()
  const exercicioId = Number(params.id)
  const [base] = useBasePr()
  const detalhe = useDetalhePr(exercicioId, base)
  const cliente = useQueryClient()
  const [mostrarSalvo, setMostrarSalvo] = useState(params.salvo === '1')
  const [editando, setEditando] = useState<Lancamento | null>(null)

  const excluir = useMutation({
    mutationFn: (lancamento: Lancamento) =>
      api<void>(`/me/prs/lancamentos/${lancamento.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      setMostrarSalvo(false)
      cliente.invalidateQueries({ queryKey: ['prs'] })
    },
  })

  function confirmarExclusao(lancamento: Lancamento) {
    Alert.alert(
      'Excluir lançamento',
      `Excluir o lançamento de ${formatarKg(lancamento.cargaKg)} kg em ${formatarData(lancamento.dataTeste)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir', style: 'destructive', onPress: () => excluir.mutate(lancamento) },
      ],
    )
  }

  if (detalhe.isPending) return <Carregando />

  if (detalhe.error) {
    const naoEncontrado = detalhe.error instanceof ErroApi && detalhe.error.status === 404
    return (
      <Tela>
        <Alerta>
          {naoEncontrado ? 'Não há PR registrado para este exercício.' : detalhe.error.message}
        </Alerta>
        <BotaoRegistrar texto="+ Registrar PR" exercicioId={exercicioId} />
      </Tela>
    )
  }

  const { exercicio, pr, percentuais, novoRecorde, diferencaKg, historico } = detalhe.data
  const maior = percentuais.at(-1)!.cargaKg

  return (
    <Tela atualizar={{ atualizando: detalhe.isRefetching, aoPuxar: () => detalhe.refetch() }}>
      <Stack.Screen options={{ title: exercicio.nome }} />
      {mostrarSalvo && <Alerta tipo="sucesso">PR registrado!</Alerta>}
      <SeletorBasePr />

      <Cartao estilo={{ alignItems: 'center', gap: 4, padding: 20 }}>
        <Titulo>{rotuloBase(base)}</Titulo>
        <Text style={{ fontSize: 44, fontWeight: '800', color: cores.texto }}>
          {formatarKg(pr.cargaKg)} <Text style={{ fontSize: 20, color: cores.textoSuave }}>kg</Text>
        </Text>
        <Text style={{ color: cores.textoSuave }}>
          Teste de carga em {formatarData(pr.dataTeste)}
        </Text>
        {diferencaKg !== null && diferencaKg !== 0 && (
          <Text
            style={{
              marginTop: 4,
              fontWeight: '600',
              color: novoRecorde ? cores.sucesso : cores.textoSuave,
            }}
          >
            {novoRecorde ? 'Novo recorde! ' : ''}
            {diferencaKg > 0 ? '+' : '−'}
            {formatarKg(Math.abs(diferencaKg))} kg em relação ao teste anterior
          </Text>
        )}
      </Cartao>

      <Cartao estilo={{ gap: 4 }}>
        <Titulo>Cargas por percentual</Titulo>
        {percentuais.map(({ percentual, cargaKg }) => (
          <View
            key={percentual}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}
          >
            <Text style={{ width: 46, fontSize: 18, fontWeight: '700', color: cores.marcaEscura }}>
              {percentual}%
            </Text>
            <View
              style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: cores.cinzaClaro }}
            >
              <View
                style={{
                  width: `${(cargaKg / maior) * 100}%`,
                  height: '100%',
                  borderRadius: 4,
                  backgroundColor: cores.marca,
                }}
              />
            </View>
            <Text
              style={{
                width: 84,
                textAlign: 'right',
                fontSize: 18,
                fontWeight: '800',
                color: cores.texto,
              }}
            >
              {formatarKg(cargaKg)} kg
            </Text>
          </View>
        ))}
        <Text style={{ fontSize: 12, color: cores.textoSuave }}>
          Valores arredondados para o múltiplo de 0,5 kg mais próximo.
        </Text>
      </Cartao>

      <Cartao estilo={{ gap: 4 }}>
        <Titulo>Histórico de testes</Titulo>
        {excluir.error && <Alerta>{excluir.error.message}</Alerta>}
        {historico.map((lancamento, i) => (
          <View
            key={lancamento.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 8,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: cores.cinzaClaro,
            }}
          >
            <Text style={{ color: cores.texto }}>
              {formatarData(lancamento.dataTeste)}
              {lancamento.origem !== 'ALUNO' && (
                <Text style={{ fontSize: 12, color: cores.textoSuave }}> (treinador)</Text>
              )}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '700', color: cores.texto }}>
                {formatarKg(lancamento.cargaKg)} kg
              </Text>
              <Botao
                variante="link"
                aoPressionar={() => setEditando(lancamento)}
                estilo={{ minHeight: 36, paddingVertical: 4, paddingHorizontal: 8 }}
              >
                Editar
              </Botao>
              {lancamento.origem === 'ALUNO' && (
                <Botao
                  variante="link"
                  aoPressionar={() => confirmarExclusao(lancamento)}
                  estilo={{ minHeight: 36, paddingVertical: 4, paddingHorizontal: 8 }}
                >
                  Excluir
                </Botao>
              )}
            </View>
          </View>
        ))}
      </Cartao>

      <BotaoRegistrar exercicioId={exercicio.id} />

      {editando && (
        <EditarPr
          titulo={`Editar PR de ${exercicio.nome}`}
          pr={editando}
          caminho={`/me/prs/lancamentos/${editando.id}`}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null)
            setMostrarSalvo(false)
            cliente.invalidateQueries({ queryKey: ['prs'] })
            cliente.invalidateQueries({ queryKey: ['evolucao'] })
          }}
        />
      )}
    </Tela>
  )
}
