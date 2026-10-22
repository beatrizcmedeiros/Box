import { useMutation, useQueryClient } from '@tanstack/react-query'
import { router, useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela, Titulo } from '../../components/ui'
import { api, ErroApi } from '../../lib/api'
import { useExerciciosAtivos, usePrs } from '../../lib/consultas'
import {
  formatarData,
  formatarKg,
  hojeIso,
  lerData,
  lerNumero,
  mascaraData,
} from '../../lib/formato'
import { cores } from '../../lib/tema'
import type { Lancamento } from '../../lib/tipos'

/** Registro do resultado de um teste de carga. */
export default function RegistrarPr() {
  const params = useLocalSearchParams<{ exercicio?: string }>()
  const cliente = useQueryClient()
  const exercicios = useExerciciosAtivos()
  const prs = usePrs()

  const [exercicioId, setExercicioId] = useState(Number(params.exercicio) || 0)
  const [data, setData] = useState(formatarData(hojeIso()))
  const [carga, setCarga] = useState('')
  const [erroData, setErroData] = useState<string>()

  const cargaKg = lerNumero(carga)
  const prAtual = prs.data?.find((r) => r.exercicio.id === exercicioId)?.pr.cargaKg
  const novoRecorde = prAtual !== undefined && cargaKg > prAtual

  const salvar = useMutation({
    mutationFn: (dataTeste: string) =>
      api<Lancamento>('/me/prs', {
        method: 'POST',
        body: { exercicioId, dataTeste, cargaKg: Number.isNaN(cargaKg) ? carga : cargaKg },
      }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['prs'] })
      router.replace({
        pathname: '/exercicio/[id]',
        params: { id: String(exercicioId), salvo: '1' },
      })
    },
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  function enviar() {
    const dataTeste = lerData(data)
    if (!dataTeste) {
      setErroData('Data inválida. Use o formato DD/MM/AAAA.')
      return
    }
    if (dataTeste > hojeIso()) {
      setErroData('A data do teste não pode ser no futuro.')
      return
    }
    setErroData(undefined)
    salvar.mutate(dataTeste)
  }

  return (
    <Tela>
      <Cartao estilo={{ gap: 16 }}>
        <View style={{ gap: 8 }}>
          <Titulo>Exercício</Titulo>
          {exercicios.isPending ? (
            <Carregando />
          ) : exercicios.error ? (
            <Alerta>{exercicios.error.message}</Alerta>
          ) : exercicios.data.length === 0 ? (
            <Alerta tipo="info">
              Nenhum exercício disponível ainda. Peça ao seu treinador para cadastrar os exercícios
              do box.
            </Alerta>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {exercicios.data.map((e) => {
                const ativo = e.id === exercicioId
                return (
                  <Pressable
                    key={e.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ativo }}
                    onPress={() => setExercicioId(e.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: ativo ? cores.marcaForte : '#cbd5e1',
                      backgroundColor: ativo ? cores.marcaClara : cores.branco,
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: ativo ? '700' : '500',
                        color: ativo ? cores.marcaEscura : cores.texto,
                      }}
                    >
                      {e.nome}
                      {e.origem ? (
                        <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                          {` · ${e.origem}`}
                        </Text>
                      ) : null}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          )}
          <NovoExercicioPessoal aoCriar={setExercicioId} />
          {erro?.doCampo('exercicioId') && (
            <Text style={{ color: cores.erro, fontSize: 13 }}>{erro.doCampo('exercicioId')}</Text>
          )}
        </View>

        <Campo
          rotulo="Data do teste de carga"
          value={data}
          onChangeText={(t) => setData(mascaraData(t))}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          erro={erroData ?? erro?.doCampo('dataTeste')}
        />
        <Campo
          rotulo="Carga máxima (PR) em kg"
          value={carga}
          onChangeText={setCarga}
          keyboardType="decimal-pad"
          placeholder="Ex.: 105 ou 92,5"
          grande
          erro={erro?.doCampo('cargaKg')}
        />

        {novoRecorde && (
          <Alerta tipo="sucesso">
            Novo recorde! +{formatarKg(cargaKg - prAtual)} kg em relação ao PR atual (
            {formatarKg(prAtual)} kg)
          </Alerta>
        )}
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}

        <Botao
          aoPressionar={enviar}
          precisaInternet
          carregando={salvar.isPending}
          desabilitado={!exercicioId}
        >
          Salvar PR
        </Botao>
        <Botao variante="link" aoPressionar={() => router.back()}>
          Cancelar
        </Botao>
      </Cartao>
    </Tela>
  )
}

/** Exercício que não está na lista: o aluno cria um pessoal (só ele usa). */
function NovoExercicioPessoal({ aoCriar }: { aoCriar: (id: number) => void }) {
  const cliente = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const criar = useMutation({
    mutationFn: () => api<{ id: number }>('/me/exercicios', { method: 'POST', body: { nome } }),
    onSuccess: async ({ id }) => {
      await cliente.invalidateQueries({ queryKey: ['exercicios-ativos'] })
      aoCriar(id)
      setNome('')
      setAberto(false)
    },
  })

  if (!aberto) {
    return (
      <Botao variante="link" aoPressionar={() => setAberto(true)}>
        + Exercício que não está na lista
      </Botao>
    )
  }
  return (
    <View style={{ gap: 8, backgroundColor: cores.cinzaClaro, borderRadius: 12, padding: 12 }}>
      <Campo
        rotulo="Nome do exercício pessoal"
        value={nome}
        onChangeText={setNome}
        dica="Só você usa este exercício."
      />
      {criar.error && <Alerta>{criar.error.message}</Alerta>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Botao variante="secundario" aoPressionar={() => setAberto(false)} estilo={{ flex: 1 }}>
          Cancelar
        </Botao>
        <Botao
          aoPressionar={() => criar.mutate()}
          carregando={criar.isPending}
          desabilitado={!nome.trim()}
          precisaInternet
          estilo={{ flex: 1 }}
        >
          Criar
        </Botao>
      </View>
    </View>
  )
}
