import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Text, TextInput, View } from 'react-native'
import { Busca, Chips, Etiqueta, opcoesTurma } from '../../../components/seletores'
import { CampoData } from '../../../components/CampoData'
import { Alerta, Botao, Cartao, Carregando, Tela } from '../../../components/ui'
import { api, ErroApi, gestao } from '../../../lib/api'
import {
  useAlunosParaLancar,
  useAtrasado,
  useExercicios,
  useTurmas,
} from '../../../lib/consultasTreinador'
import { formatarData, formatarKg, hojeIso, lerNumero } from '../../../lib/formato'
import { cores } from '../../../lib/tema'
import type { AlunoParaLancar, ResultadoLancamento } from '../../../lib/tipos'

const CARGA_MINIMA_KG = 1
const CARGA_MAXIMA_KG = 500

const cargaValida = (texto: string) => {
  const kg = lerNumero(texto)
  return (
    !Number.isNaN(kg) &&
    kg >= CARGA_MINIMA_KG &&
    kg <= CARGA_MAXIMA_KG &&
    Number.isInteger(Math.round(kg * 1e4) / 100)
  )
}

/**
 * Teste de carga: ao final da aula o treinador escolhe a data (hoje por padrão), o exercício
 * e a turma (ou pesquisa um aluno) e lança a carga máxima de cada um na mesma tela.
 */
export default function TesteDeCarga() {
  const exercicios = useExercicios()
  const turmas = useTurmas()
  const ativos = (exercicios.data ?? []).filter((e) => e.ativo)

  const [dataIso, setDataIso] = useState(hojeIso())
  const [exercicioId, setExercicioId] = useState<number | null>(null)
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState<string | null>(null)

  const exercicioEscolhido = exercicioId ?? ativos[0]?.id ?? null
  const nomeExercicio = ativos.find((e) => e.id === exercicioEscolhido)?.nome ?? ''

  if (exercicios.isPending) return <Carregando />
  if (exercicios.error) {
    return (
      <Tela>
        <Alerta>{exercicios.error.message}</Alerta>
      </Tela>
    )
  }

  return (
    <Tela>
      <Cartao estilo={{ gap: 14 }}>
        <CampoData
          rotulo="Data do teste"
          valor={dataIso}
          aoMudar={(iso) => {
            setDataIso(iso)
            setMensagem(null)
          }}
        />
        {ativos.length === 0 ? (
          <Alerta tipo="info">Cadastre um exercício primeiro (Mais → Exercícios).</Alerta>
        ) : (
          <Chips
            rotulo="Exercício"
            opcoes={ativos.map((e) => ({ valor: e.id, rotulo: e.nome }))}
            valor={exercicioEscolhido}
            aoEscolher={(id) => {
              setExercicioId(id)
              setMensagem(null)
            }}
          />
        )}
        <Chips
          rotulo="Turma"
          opcoes={opcoesTurma(turmas.data)}
          valor={turmaId}
          aoEscolher={setTurmaId}
        />
        <Busca valor={busca} aoMudar={setBusca} />
      </Cartao>

      {mensagem && <Alerta tipo="sucesso">{mensagem}</Alerta>}

      {exercicioEscolhido && (
        <ListaLancamento
          // Trocar data ou exercício recomeça a digitação
          key={`${dataIso}-${exercicioEscolhido}`}
          dataIso={dataIso}
          exercicioId={exercicioEscolhido}
          nomeExercicio={nomeExercicio}
          turmaId={turmaId}
          busca={busca}
          aoSalvar={setMensagem}
        />
      )}
    </Tela>
  )
}

function ListaLancamento({
  dataIso,
  exercicioId,
  nomeExercicio,
  turmaId,
  busca,
  aoSalvar,
}: {
  dataIso: string
  exercicioId: number
  nomeExercicio: string
  turmaId: number | null
  busca: string
  aoSalvar: (mensagem: string) => void
}) {
  const cliente = useQueryClient()
  const buscaAtrasada = useAtrasado(busca.trim())
  const lista = useAlunosParaLancar({ data: dataIso, exercicioId, turmaId, busca: buscaAtrasada })
  // Cargas digitadas, por aluno; ficam guardadas ao trocar de turma ou pesquisar
  const [cargas, setCargas] = useState<Record<number, string>>({})

  const alunos = lista.data?.alunos ?? []
  const valorDe = (a: AlunoParaLancar) =>
    cargas[a.aluno.id] ??
    (a.lancamento?.origem === 'TREINADOR' ? formatarKg(a.lancamento.cargaKg) : '')

  // Envia só o que foi digitado e mudou em relação ao que já está gravado
  const alterados = Object.entries(cargas)
    .map(([id, texto]) => ({ usuarioId: Number(id), texto: texto.trim() }))
    .filter(({ texto }) => texto !== '')
  const invalidos = alterados.filter(({ texto }) => !cargaValida(texto))

  const salvar = useMutation({
    mutationFn: () =>
      api<ResultadoLancamento>(gestao('/lancamentos'), {
        method: 'POST',
        body: {
          dataTeste: dataIso,
          exercicioId,
          resultados: alterados.map(({ usuarioId, texto }) => ({
            usuarioId,
            cargaKg: lerNumero(texto),
          })),
        },
      }),
    onSuccess: (r) => {
      setCargas({})
      invalidarDados()
      const partes = [
        `${r.criados + r.atualizados} carga(s) de ${nomeExercicio} salva(s)`,
        r.novosRecordes.length > 0
          ? `Novos PRs: ${r.novosRecordes.map((n) => `${n.nome.split(' ')[0]} (${formatarKg(n.cargaKg)} kg)`).join(', ')}`
          : null,
      ]
      aoSalvar(partes.filter(Boolean).join('. ') + '.')
    },
  })

  const remover = useMutation({
    mutationFn: (id: number) => api<void>(gestao(`/lancamentos/${id}`), { method: 'DELETE' }),
    onSuccess: invalidarDados,
  })

  function invalidarDados() {
    for (const chave of ['lancamentos', 'cargas', 'percentuais', 'visao-geral', 'evolucao']) {
      cliente.invalidateQueries({ queryKey: [chave] })
    }
  }

  function confirmarRemocao(a: AlunoParaLancar) {
    Alert.alert(
      'Remover lançamento',
      `Remover ${formatarKg(a.lancamento!.cargaKg)} kg de ${a.aluno.nome} em ${formatarData(dataIso)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setCargas(({ [a.aluno.id]: _, ...resto }) => resto)
            remover.mutate(a.lancamento!.id)
          },
        },
      ],
    )
  }

  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  if (lista.isPending) return <Carregando />
  if (lista.error) return <Alerta>{lista.error.message}</Alerta>

  return (
    <>
      {alunos.length === 0 ? (
        <Cartao>
          <Text style={{ color: cores.textoSuave, textAlign: 'center' }}>
            Nenhum aluno ativo encontrado com esses filtros.
          </Text>
        </Cartao>
      ) : (
        <Cartao estilo={{ paddingVertical: 4 }}>
          {alunos.map((a, i) => {
            const valor = valorDe(a)
            const kg = lerNumero(valor)
            const novoPr =
              cargaValida(valor) && a.melhorAnteriorKg !== null && kg > a.melhorAnteriorKg
            const invalido = valor.trim() !== '' && !cargaValida(valor)
            return (
              <View
                key={a.aluno.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 10,
                  borderTopWidth: i === 0 ? 0 : 1,
                  borderTopColor: cores.cinzaClaro,
                }}
              >
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: cores.texto }}>
                    {a.aluno.nome}
                  </Text>
                  <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                    {a.prAtual
                      ? `PR ${formatarKg(a.prAtual.cargaKg)} kg em ${formatarData(a.prAtual.dataTeste)}`
                      : 'Sem PR anterior'}
                    {a.turma ? ` · ${a.turma.nome}` : ''}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {novoPr && <Etiqueta cor="laranja">NOVO PR</Etiqueta>}
                    {a.lancamento && a.lancamento.origem !== 'TREINADOR' && (
                      <Etiqueta>
                        {`${a.lancamento.origem === 'ALUNO' ? 'Aluno registrou' : 'Importado'} ${formatarKg(a.lancamento.cargaKg)} kg`}
                      </Etiqueta>
                    )}
                    {a.lancamento?.origem === 'TREINADOR' && cargas[a.aluno.id] === undefined && (
                      <Text
                        onPress={() => confirmarRemocao(a)}
                        style={{ fontSize: 12, fontWeight: '600', color: cores.erro }}
                      >
                        Remover
                      </Text>
                    )}
                  </View>
                </View>
                <TextInput
                  accessibilityLabel={`Carga de ${a.aluno.nome} em kg`}
                  value={valor}
                  onChangeText={(t) => setCargas((c) => ({ ...c, [a.aluno.id]: t }))}
                  keyboardType="decimal-pad"
                  placeholder="kg"
                  placeholderTextColor="#94a3b8"
                  style={{
                    width: 84,
                    minHeight: 44,
                    borderWidth: 1,
                    borderColor: invalido ? cores.erro : '#cbd5e1',
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    fontSize: 18,
                    fontWeight: '700',
                    textAlign: 'right',
                    color: cores.texto,
                    backgroundColor: cores.branco,
                  }}
                />
              </View>
            )
          })}
        </Cartao>
      )}

      {invalidos.length > 0 && (
        <Alerta>
          {`Corrija ${invalidos.length} carga(s) inválida(s): use de ${CARGA_MINIMA_KG} a ${CARGA_MAXIMA_KG} kg.`}
        </Alerta>
      )}
      {erro && <Alerta>{erro.campos[0]?.mensagem ?? erro.message}</Alerta>}
      {remover.error && <Alerta>{remover.error.message}</Alerta>}
      <Botao
        aoPressionar={() => salvar.mutate()}
        precisaInternet
        carregando={salvar.isPending}
        desabilitado={alterados.length === 0 || invalidos.length > 0}
      >
        {alterados.length > 0 ? `Salvar ${alterados.length} carga(s)` : 'Salvar cargas'}
      </Botao>
    </>
  )
}
