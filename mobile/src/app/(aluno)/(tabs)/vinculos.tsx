import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela } from '../../../components/ui'
import { api, ErroApi } from '../../../lib/api'
import { cores } from '../../../lib/tema'
import type { Vinculos } from '../../../lib/tipos'

type ResultadoCodigo =
  | { tipo: 'academia'; academia: { nome: string } }
  | { tipo: 'professor'; professor: { nome: string } }
  | { tipo: 'professor_da_academia'; academia: { nome: string } }

const mensagemDe = (r: ResultadoCodigo) =>
  r.tipo === 'academia'
    ? `Pronto! Você está vinculado a ${r.academia.nome}.`
    : r.tipo === 'professor'
      ? `Pronto! ${r.professor.nome} passa a acompanhar os seus PRs.`
      : `Pronto! Você agora é professor de ${r.academia.nome}.`

/** Academias e professores que acompanham os PRs do aluno; vincular por código ou desfazer. */
export default function MeusVinculos() {
  const cliente = useQueryClient()
  const vinculos = useQuery({ queryKey: ['vinculos'], queryFn: () => api<Vinculos>('/vinculos') })
  const [codigo, setCodigo] = useState('')

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['vinculos'] })
    // Exercícios da academia ou do professor passam a aparecer (ou somem) ao registrar PR
    cliente.invalidateQueries({ queryKey: ['exercicios-ativos'] })
    cliente.invalidateQueries({ queryKey: ['contextos'] })
  }

  const usar = useMutation({
    mutationFn: () =>
      api<ResultadoCodigo>('/vinculos/codigo', { method: 'POST', body: { codigo } }),
    onSuccess: () => {
      setCodigo('')
      atualizar()
    },
  })
  const desfazer = useMutation({
    mutationFn: (id: number) => api<void>(`/vinculos/${id}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })
  const erro = usar.error instanceof ErroApi ? usar.error : null

  return (
    <Tela atualizar={{ atualizando: vinculos.isRefetching, aoPuxar: () => vinculos.refetch() }}>
      <Cartao estilo={{ gap: 12 }}>
        <Text style={{ color: cores.textoSuave }}>
          Recebeu um código do seu box ou do seu professor? Digite aqui para ele acompanhar os seus
          PRs.
        </Text>
        <Campo
          rotulo="Código de vínculo"
          value={codigo}
          onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="Ex.: 482913"
          maxLength={6}
          grande
          erro={erro?.doCampo('codigo')}
        />
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
        {usar.data && <Alerta tipo="sucesso">{mensagemDe(usar.data)}</Alerta>}
        <Botao
          aoPressionar={() => usar.mutate()}
          carregando={usar.isPending}
          desabilitado={codigo.length !== 6}
          precisaInternet
        >
          Vincular
        </Botao>
      </Cartao>

      {vinculos.isPending ? (
        <Carregando />
      ) : vinculos.error ? (
        <Alerta>{vinculos.error.message}</Alerta>
      ) : vinculos.data.comoAluno.length === 0 ? (
        <Cartao>
          <Text style={{ textAlign: 'center', color: cores.textoSuave }}>
            Você ainda não tem vínculos. Seus PRs ficam só com você.
          </Text>
        </Cartao>
      ) : (
        <Cartao estilo={{ paddingVertical: 4 }}>
          {desfazer.error && <Alerta>{desfazer.error.message}</Alerta>}
          {vinculos.data.comoAluno.map((v, i) => {
            const nome = v.academia?.nome ?? v.professor?.nome ?? ''
            return (
              <View
                key={v.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: cores.cinzaClaro,
                }}
              >
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ fontWeight: '600', color: cores.texto }}>{nome}</Text>
                  <Text style={{ fontSize: 13, color: cores.textoSuave }}>
                    {v.tipo === 'academia' ? 'Academia' : 'Professor'}
                    {v.turma ? ` · ${v.turma.nome}` : ''}
                  </Text>
                </View>
                <Botao
                  variante="link"
                  precisaInternet
                  aoPressionar={() =>
                    Alert.alert(
                      'Desfazer vínculo',
                      `Os seus PRs continuam com você, mas ${nome} deixa de vê-los.`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Desfazer',
                          style: 'destructive',
                          onPress: () => desfazer.mutate(v.id),
                        },
                      ],
                    )
                  }
                >
                  Desfazer
                </Botao>
              </View>
            )
          })}
        </Cartao>
      )}
    </Tela>
  )
}
