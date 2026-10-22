import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Alert, FlatList, Modal, Pressable, Switch, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Busca, Chips, Etiqueta, opcoesTurma } from '../../components/seletores'
import { Alerta, Botao, Campo, Cartao, Tela, Titulo } from '../../components/ui'
import { api, ErroApi, gestao } from '../../lib/api'
import { useImportacoes, useTurmas } from '../../lib/consultasTreinador'
import { formatarData, hojeIso, lerData, mascaraData } from '../../lib/formato'
import {
  cargaValida,
  type LinhaEditavel,
  linhasDuplicadas,
  montarEnvio,
  montarEstado,
  pendenciaDaLinha,
  type SecaoEditavel,
} from '../../lib/importacao'
import { cores } from '../../lib/tema'
import type { Previa } from '../../lib/tipos'

type Revisao = { previa: Previa; secoes: SecaoEditavel[]; linhas: LinhaEditavel[] }

/**
 * Importação da lista do teste de força. No app, o treinador cola o texto da nota
 * (ex.: Samsung Notes). A leitura de PDF e o OCR ficam na versão web.
 */
export default function Importar() {
  const turmas = useTurmas()
  const [dataTexto, setDataTexto] = useState(formatarData(hojeIso()))
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [texto, setTexto] = useState('')
  const [revisao, setRevisao] = useState<Revisao | null>(null)
  const [mensagem, setMensagem] = useState<string | null>(null)

  const dataIso = lerData(dataTexto)
  const dataValida = !!dataIso && dataIso <= hojeIso()

  const previa = useMutation({
    mutationFn: () =>
      api<Previa>(gestao('/importacoes/previa'), { method: 'POST', body: { texto, turmaId } }),
    onSuccess: (p) => {
      setMensagem(null)
      setRevisao({ previa: p, ...montarEstado(p) })
    },
  })

  if (revisao && dataIso) {
    return (
      <RevisaoLista
        revisao={revisao}
        setRevisao={setRevisao}
        dataIso={dataIso}
        turmaId={turmaId}
        aoConcluir={(m) => {
          setRevisao(null)
          setTexto('')
          setMensagem(m)
        }}
      />
    )
  }

  return (
    <Tela>
      {mensagem && <Alerta tipo="sucesso">{mensagem}</Alerta>}
      <Cartao estilo={{ gap: 14 }}>
        <Campo
          rotulo="Data do teste"
          value={dataTexto}
          onChangeText={(t) => setDataTexto(mascaraData(t))}
          keyboardType="number-pad"
          placeholder="DD/MM/AAAA"
          maxLength={10}
          erro={dataTexto.length === 10 && !dataValida ? 'Data inválida ou no futuro' : undefined}
        />
        <Chips
          rotulo="Turma (ajuda a desempatar nomes iguais)"
          opcoes={opcoesTurma(turmas.data)}
          valor={turmaId}
          aoEscolher={setTurmaId}
        />
        <View style={{ gap: 6 }}>
          <Titulo>Texto da lista</Titulo>
          <TextInput
            accessibilityLabel="Texto da lista"
            value={texto}
            onChangeText={setTexto}
            multiline
            textAlignVertical="top"
            placeholder={'Teste agachamento\nAna 55kg\nLurdinha 85\nLucas 110 kg'}
            placeholderTextColor="#94a3b8"
            style={{
              minHeight: 180,
              borderWidth: 1,
              borderColor: '#cbd5e1',
              borderRadius: 12,
              padding: 12,
              fontSize: 15,
              color: cores.texto,
              backgroundColor: cores.branco,
            }}
          />
          <Text style={{ fontSize: 13, color: cores.textoSuave }}>
            Um título por exercício e uma linha por aluno, com o nome (ou apelido) e a carga. Para
            ler um PDF, use a versão web.
          </Text>
        </View>
        {previa.error && <Alerta>{previa.error.message}</Alerta>}
        <Botao
          aoPressionar={() => previa.mutate()}
          precisaInternet
          carregando={previa.isPending}
          desabilitado={!texto.trim() || !dataValida}
        >
          Revisar lista
        </Botao>
      </Cartao>
      <Historico />
    </Tela>
  )
}

function RevisaoLista({
  revisao,
  setRevisao,
  dataIso,
  turmaId,
  aoConcluir,
}: {
  revisao: Revisao
  setRevisao: (r: Revisao | null) => void
  dataIso: string
  turmaId: number | null
  aoConcluir: (mensagem: string) => void
}) {
  const cliente = useQueryClient()
  const { previa, secoes, linhas } = revisao
  const [lembrarApelidos, setLembrarApelidos] = useState(true)
  const [escolhendoAluno, setEscolhendoAluno] = useState<LinhaEditavel | null>(null)

  const duplicadas = useMemo(() => linhasDuplicadas(linhas, secoes), [linhas, secoes])
  const envio = montarEnvio(linhas, secoes, lembrarApelidos)
  const nomeAluno = (id: number | null) => previa.alunos.find((a) => a.id === id)?.nome

  const alterarLinha = (chave: string, mudanca: Partial<LinhaEditavel>) =>
    setRevisao({
      ...revisao,
      linhas: linhas.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)),
    })
  const alterarSecao = (indice: number, mudanca: Partial<SecaoEditavel>) =>
    setRevisao({
      ...revisao,
      secoes: secoes.map((s, i) => (i === indice ? { ...s, ...mudanca } : s)),
    })

  const confirmar = useMutation({
    mutationFn: () =>
      api<{ criados: number; atualizados: number; apelidosSalvos: number }>(
        gestao('/importacoes'),
        {
          method: 'POST',
          body: { dataTeste: dataIso, turmaId, nomeArquivo: 'Texto colado (app)', ...envio },
        },
      ),
    onSuccess: (r) => {
      for (const chave of [
        'importacoes',
        'cargas',
        'percentuais',
        'visao-geral',
        'evolucao',
        'lancamentos',
        'alunos',
      ]) {
        cliente.invalidateQueries({ queryKey: [chave] })
      }
      aoConcluir(
        `${r.criados + r.atualizados} resultado(s) gravado(s)` +
          (r.apelidosSalvos ? `, ${r.apelidosSalvos} apelido(s) memorizado(s)` : '') +
          '.',
      )
    },
  })

  return (
    <Tela>
      <Cartao estilo={{ gap: 6 }}>
        <Text style={{ fontWeight: '700', color: cores.texto }}>
          Teste de {formatarData(dataIso)} · {previa.resumo.linhas} linha(s)
        </Text>
        <Text style={{ fontSize: 13, color: cores.textoSuave }}>
          {previa.resumo.encontrados} encontrados · {previa.resumo.sugestoes} sugestões para
          confirmar · {previa.resumo.naoEncontrados} não encontrados · {previa.resumo.comProblema}{' '}
          com problema
        </Text>
      </Cartao>

      {secoes.map((secao, indice) => {
        const candidatos = new Set(secao.candidatos)
        const opcoes = [...previa.exercicios].sort(
          (a, b) => Number(candidatos.has(b.id)) - Number(candidatos.has(a.id)),
        )
        return (
          <View key={indice} style={{ gap: 10 }}>
            <Cartao estilo={{ gap: 10 }}>
              <Titulo>{`Seção: ${secao.titulo ?? 'sem título'}`}</Titulo>
              {!secao.reconhecido && <Alerta tipo="info">Escolha o exercício desta seção.</Alerta>}
              <Chips
                opcoes={opcoes.map((e) => ({ valor: e.id, rotulo: e.nome }))}
                valor={secao.exercicioId}
                aoEscolher={(id) => alterarSecao(indice, { exercicioId: id })}
              />
              {!secao.reconhecido && secao.tituloLimpo !== '' && (
                <Interruptor
                  rotulo={`Lembrar "${secao.tituloLimpo}" como nome deste exercício`}
                  valor={secao.lembrarTitulo}
                  aoMudar={(v) => alterarSecao(indice, { lembrarTitulo: v })}
                />
              )}
            </Cartao>

            {linhas
              .filter((l) => l.secao === indice)
              .map((linha) => {
                const pendencia = pendenciaDaLinha(linha, secao)
                const duplicada = duplicadas.has(linha.chave)
                return (
                  <Cartao key={linha.chave} estilo={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                      <Text style={{ flexShrink: 1, fontSize: 13, color: cores.textoSuave }}>
                        Linha {linha.numero}: “{linha.texto}”
                      </Text>
                      <Switch
                        accessibilityLabel={`Incluir linha ${linha.numero}`}
                        value={linha.incluir}
                        onValueChange={(v) => alterarLinha(linha.chave, { incluir: v })}
                        trackColor={{ true: cores.marca }}
                      />
                    </View>
                    <EtiquetaSituacao linha={linha} />
                    {linha.detalhe && (
                      <Text style={{ fontSize: 12, color: cores.textoSuave }}>{linha.detalhe}</Text>
                    )}
                    <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setEscolhendoAluno(linha)}
                        style={{
                          flex: 1,
                          minHeight: 44,
                          justifyContent: 'center',
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{ color: linha.alunoId ? cores.texto : cores.textoSuave }}
                        >
                          {nomeAluno(linha.alunoId) ?? 'Escolher aluno…'}
                        </Text>
                      </Pressable>
                      <TextInput
                        accessibilityLabel={`Carga da linha ${linha.numero}`}
                        value={linha.carga}
                        onChangeText={(t) => alterarLinha(linha.chave, { carga: t })}
                        keyboardType="decimal-pad"
                        placeholder="kg"
                        style={{
                          width: 80,
                          minHeight: 44,
                          borderWidth: 1,
                          borderColor:
                            linha.carga && !cargaValida(linha.carga) ? cores.erro : '#cbd5e1',
                          borderRadius: 10,
                          paddingHorizontal: 10,
                          fontSize: 16,
                          fontWeight: '700',
                          textAlign: 'right',
                          color: cores.texto,
                        }}
                      />
                    </View>
                    {linha.incluir && pendencia && (
                      <Text style={{ fontSize: 12, color: cores.erro }}>{pendencia}</Text>
                    )}
                    {duplicada && (
                      <Text style={{ fontSize: 12, color: cores.erro }}>
                        O mesmo aluno aparece mais de uma vez neste exercício
                      </Text>
                    )}
                  </Cartao>
                )
              })}
          </View>
        )
      })}

      <Cartao estilo={{ gap: 12 }}>
        <Interruptor
          rotulo="Memorizar os nomes escolhidos como apelidos para as próximas importações"
          valor={lembrarApelidos}
          aoMudar={setLembrarApelidos}
        />
        {confirmar.error instanceof ErroApi && (
          <Alerta>{confirmar.error.campos[0]?.mensagem ?? confirmar.error.message}</Alerta>
        )}
        <Botao
          aoPressionar={() => confirmar.mutate()}
          precisaInternet
          carregando={confirmar.isPending}
          desabilitado={envio.resultados.length === 0 || duplicadas.size > 0}
        >
          {`Gravar ${envio.resultados.length} resultado(s)`}
        </Botao>
        <Botao variante="link" aoPressionar={() => setRevisao(null)}>
          Voltar e editar o texto
        </Botao>
      </Cartao>

      <EscolherAluno
        linha={escolhendoAluno}
        alunos={previa.alunos}
        aoFechar={() => setEscolhendoAluno(null)}
        aoEscolher={(id) => {
          alterarLinha(escolhendoAluno!.chave, { alunoId: id, escolhaManual: true, incluir: true })
          setEscolhendoAluno(null)
        }}
      />
    </Tela>
  )
}

function EtiquetaSituacao({ linha }: { linha: LinhaEditavel }) {
  const mapa = {
    encontrado: ['Encontrado', 'verde'],
    sugestao: ['Confirme o aluno', 'amarelo'],
    nao_encontrado: ['Não encontrado', 'vermelho'],
    problema: ['Problema na linha', 'vermelho'],
  } as const
  const [texto, cor] = mapa[linha.situacao]
  return (
    <Etiqueta cor={linha.escolhaManual ? 'verde' : cor}>
      {linha.escolhaManual ? 'Escolhido' : texto}
    </Etiqueta>
  )
}

function Interruptor({
  rotulo,
  valor,
  aoMudar,
}: {
  rotulo: string
  valor: boolean
  aoMudar: (v: boolean) => void
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ flex: 1, fontSize: 14, color: cores.texto }}>{rotulo}</Text>
      <Switch
        accessibilityLabel={rotulo}
        value={valor}
        onValueChange={aoMudar}
        trackColor={{ true: cores.marca }}
      />
    </View>
  )
}

/** Lista de alunos para associar a uma linha; os sugeridos aparecem primeiro. */
function EscolherAluno({
  linha,
  alunos,
  aoFechar,
  aoEscolher,
}: {
  linha: LinhaEditavel | null
  alunos: Previa['alunos']
  aoFechar: () => void
  aoEscolher: (id: number) => void
}) {
  const [busca, setBusca] = useState('')
  const termo = busca.trim().toLowerCase()
  const sugeridos = new Set(linha?.candidatos ?? [])
  const lista = alunos
    .filter((a) => !termo || a.nome.toLowerCase().includes(termo))
    .sort((a, b) => Number(sugeridos.has(b.id)) - Number(sugeridos.has(a.id)))

  return (
    <Modal visible={!!linha} animationType="slide" onRequestClose={aoFechar}>
      <SafeAreaView style={{ flex: 1, backgroundColor: cores.fundo, padding: 16, gap: 12 }}>
        <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto }}>
          Quem é “{linha?.nomeLido}”?
        </Text>
        <Busca valor={busca} aoMudar={setBusca} placeholder="Pesquisar aluno" />
        <FlatList
          data={lista}
          keyExtractor={(a) => String(a.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => aoEscolher(item.id)}
              style={({ pressed }) => ({
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: cores.borda,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ fontSize: 16, color: cores.texto }}>
                {item.nome}
                {sugeridos.has(item.id) && (
                  <Text style={{ color: cores.marcaEscura }}> · sugerido</Text>
                )}
              </Text>
              {item.turma && (
                <Text style={{ fontSize: 12, color: cores.textoSuave }}>{item.turma}</Text>
              )}
            </Pressable>
          )}
        />
        <Botao variante="secundario" aoPressionar={aoFechar}>
          Cancelar
        </Botao>
      </SafeAreaView>
    </Modal>
  )
}

/** Últimas importações, com a opção de desfazer. */
function Historico() {
  const cliente = useQueryClient()
  const importacoes = useImportacoes()
  const desfazer = useMutation({
    mutationFn: (id: number) =>
      api<{ removidos: number }>(gestao(`/importacoes/${id}`), { method: 'DELETE' }),
    onSuccess: () => {
      for (const chave of [
        'importacoes',
        'cargas',
        'percentuais',
        'visao-geral',
        'evolucao',
        'lancamentos',
      ]) {
        cliente.invalidateQueries({ queryKey: [chave] })
      }
    },
  })

  const lista = (importacoes.data ?? []).slice(0, 10)
  if (lista.length === 0) return null

  return (
    <Cartao estilo={{ gap: 4 }}>
      <Titulo>Últimas importações</Titulo>
      {desfazer.error && <Alerta>{desfazer.error.message}</Alerta>}
      {lista.map((imp, i) => (
        <View
          key={imp.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingVertical: 8,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: cores.cinzaClaro,
          }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '600', color: cores.texto }}>
              Teste de {formatarData(imp.dataTeste)}
            </Text>
            <Text style={{ fontSize: 12, color: cores.textoSuave }}>
              {imp.nomeArquivo} · {imp.resultadosAtuais} resultado(s)
              {imp.turma ? ` · ${imp.turma.nome}` : ''}
            </Text>
          </View>
          {imp.status === 'CANCELADA' ? (
            <Etiqueta>Desfeita</Etiqueta>
          ) : (
            <Botao
              variante="link"
              aoPressionar={() =>
                Alert.alert(
                  'Desfazer importação',
                  `Remover os ${imp.resultadosAtuais} resultado(s) do teste de ${formatarData(imp.dataTeste)}?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Desfazer',
                      style: 'destructive',
                      onPress: () => desfazer.mutate(imp.id),
                    },
                  ],
                )
              }
            >
              Desfazer
            </Botao>
          )}
        </View>
      ))}
    </Cartao>
  )
}
