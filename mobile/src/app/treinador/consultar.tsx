import { useState } from 'react'
import { Text, View } from 'react-native'
import { Busca, Chips, opcoesTurma } from '../../components/seletores'
import { Alerta, Botao, Cartao, Carregando, Tela } from '../../components/ui'
import {
  useAtrasado,
  useConsultaCargas,
  useExercicios,
  useTurmas,
} from '../../lib/consultasTreinador'
import { formatarData, formatarKg } from '../../lib/formato'
import { cores } from '../../lib/tema'
import type { OrdenacaoCargas } from '../../lib/tipos'

const ordenacoes: { valor: OrdenacaoCargas; rotulo: string; direcao: 'asc' | 'desc' }[] = [
  { valor: 'carga', rotulo: 'Maior carga', direcao: 'desc' },
  { valor: 'aluno', rotulo: 'Nome', direcao: 'asc' },
  { valor: 'data', rotulo: 'Mais recentes', direcao: 'desc' },
  { valor: 'variacao', rotulo: 'Maior evolução', direcao: 'desc' },
]

/** PR vigente de cada aluno em cada exercício, com filtros combináveis. */
export default function ConsultarCargas() {
  const exercicios = useExercicios()
  const turmas = useTurmas()
  const [exercicioId, setExercicioId] = useState<number | null>(null)
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const [ordenar, setOrdenar] = useState<OrdenacaoCargas>('carga')
  const [pagina, setPagina] = useState(1)
  const buscaAtrasada = useAtrasado(busca.trim())

  const direcao = ordenacoes.find((o) => o.valor === ordenar)!.direcao
  const consulta = useConsultaCargas({
    busca: buscaAtrasada,
    exercicioId,
    turmaId,
    ordenar,
    direcao,
    pagina,
  })

  // Qualquer filtro novo volta para a primeira página
  const filtrar =
    <T,>(definir: (v: T) => void) =>
    (v: T) => {
      definir(v)
      setPagina(1)
    }

  return (
    <Tela atualizar={{ atualizando: consulta.isRefetching, aoPuxar: () => consulta.refetch() }}>
      <Cartao estilo={{ gap: 14 }}>
        <Chips
          rotulo="Exercício"
          opcoes={[
            { valor: null, rotulo: 'Todos' },
            ...(exercicios.data ?? []).map((e) => ({ valor: e.id, rotulo: e.nome })),
          ]}
          valor={exercicioId}
          aoEscolher={filtrar(setExercicioId)}
        />
        <Chips
          rotulo="Turma"
          opcoes={opcoesTurma(turmas.data)}
          valor={turmaId}
          aoEscolher={filtrar(setTurmaId)}
        />
        <Busca valor={busca} aoMudar={filtrar(setBusca)} />
        <Chips
          rotulo="Ordenar por"
          opcoes={ordenacoes}
          valor={ordenar}
          aoEscolher={filtrar(setOrdenar)}
        />
      </Cartao>

      {consulta.isPending ? (
        <Carregando />
      ) : consulta.error ? (
        <Alerta>{consulta.error.message}</Alerta>
      ) : (
        <>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Total rotulo="Alunos" valor={String(consulta.data.totais.alunos)} />
            <Total
              rotulo="Maior"
              valor={
                consulta.data.totais.maiorCargaKg !== null
                  ? `${formatarKg(consulta.data.totais.maiorCargaKg)} kg`
                  : '—'
              }
            />
            <Total
              rotulo="Média"
              valor={
                consulta.data.totais.mediaKg !== null
                  ? `${formatarKg(consulta.data.totais.mediaKg)} kg`
                  : '—'
              }
            />
          </View>

          {consulta.data.resultados.length === 0 ? (
            <Cartao>
              <Text style={{ color: cores.textoSuave, textAlign: 'center' }}>
                Nenhuma carga encontrada com esses filtros.
              </Text>
            </Cartao>
          ) : (
            <Cartao estilo={{ paddingVertical: 4 }}>
              {consulta.data.resultados.map((r, i) => (
                <View
                  key={`${r.aluno.id}-${r.exercicio.id}`}
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
                    <Text style={{ fontWeight: '600', color: cores.texto }}>{r.aluno.nome}</Text>
                    <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                      {r.exercicio.nome} · {formatarData(r.dataTeste)}
                      {r.turma ? ` · ${r.turma.nome}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: cores.texto }}>
                      {formatarKg(r.cargaKg)} kg
                    </Text>
                    {r.variacaoKg !== null && r.variacaoKg !== 0 && (
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '600',
                          color: r.variacaoKg > 0 ? cores.sucesso : cores.erro,
                        }}
                      >
                        {r.variacaoKg > 0 ? '+' : '−'}
                        {formatarKg(Math.abs(r.variacaoKg))} kg
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </Cartao>
          )}

          {consulta.data.totalPaginas > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Botao
                variante="secundario"
                aoPressionar={() => setPagina((p) => p - 1)}
                desabilitado={pagina <= 1}
                estilo={{ flex: 1 }}
              >
                Anterior
              </Botao>
              <Text style={{ color: cores.textoSuave }}>
                {pagina} de {consulta.data.totalPaginas}
              </Text>
              <Botao
                variante="secundario"
                aoPressionar={() => setPagina((p) => p + 1)}
                desabilitado={pagina >= consulta.data.totalPaginas}
                estilo={{ flex: 1 }}
              >
                Próxima
              </Botao>
            </View>
          )}
        </>
      )}
    </Tela>
  )
}

function Total({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <Cartao estilo={{ flex: 1, padding: 12 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: cores.textoSuave }}>{rotulo}</Text>
      <Text style={{ fontSize: 16, fontWeight: '800', color: cores.texto }}>{valor}</Text>
    </Cartao>
  )
}
