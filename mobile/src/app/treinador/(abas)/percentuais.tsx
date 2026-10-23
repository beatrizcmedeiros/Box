import { useState } from 'react'
import { Text, View } from 'react-native'
import { Busca, Chips, opcoesTurma } from '../../../components/seletores'
import { SeletorBasePr } from '../../../components/SeletorBasePr'
import { Alerta, Cartao, Carregando, Tela } from '../../../components/ui'
import { useBasePr } from '../../../lib/basePr'
import {
  useAtrasado,
  useExercicios,
  usePercentuaisAlunos,
  useTurmas,
} from '../../../lib/consultasTreinador'
import { formatarData, formatarKg } from '../../../lib/formato'
import { cores } from '../../../lib/tema'

/**
 * Cargas de 35% a 55% do PR vigente de vários alunos de uma vez: útil quando o aluno
 * está sem o celular na aula.
 */
export default function PercentuaisAlunos() {
  const exercicios = useExercicios()
  const turmas = useTurmas()
  const [exercicioId, setExercicioId] = useState<number | null>(null)
  const [turmaId, setTurmaId] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useAtrasado(busca.trim())

  const [base] = useBasePr()
  const consulta = usePercentuaisAlunos({
    busca: buscaAtrasada,
    exercicioId,
    turmaId,
    base: base === 'maior' ? base : undefined,
  })
  const temFiltro = !!(buscaAtrasada || exercicioId || turmaId)

  return (
    <Tela atualizar={{ atualizando: consulta.isRefetching, aoPuxar: () => consulta.refetch() }}>
      <Cartao estilo={{ gap: 14 }}>
        <Chips
          rotulo="Exercício"
          opcoes={[
            { valor: null, rotulo: 'Todos' },
            ...(exercicios.data ?? [])
              .filter((e) => e.ativo)
              .map((e) => ({ valor: e.id, rotulo: e.nome })),
          ]}
          valor={exercicioId}
          aoEscolher={setExercicioId}
        />
        <Chips
          rotulo="Turma"
          opcoes={opcoesTurma(turmas.data)}
          valor={turmaId}
          aoEscolher={setTurmaId}
        />
        <Busca valor={busca} aoMudar={setBusca} />
        <SeletorBasePr />
      </Cartao>

      {!temFiltro ? (
        <Alerta tipo="info">Escolha uma turma, um exercício ou pesquise um aluno.</Alerta>
      ) : consulta.isPending ? (
        <Carregando />
      ) : consulta.error ? (
        <Alerta>{consulta.error.message}</Alerta>
      ) : consulta.data.resultados.length === 0 ? (
        <Cartao>
          <Text style={{ color: cores.textoSuave, textAlign: 'center' }}>
            Nenhum PR encontrado com esses filtros.
          </Text>
        </Cartao>
      ) : (
        <>
          <Text style={{ color: cores.textoSuave }}>
            {consulta.data.totais.alunos} aluno(s) · {consulta.data.totais.registros} PR(s)
          </Text>
          {consulta.data.limitado && (
            <Alerta tipo="info">Muitos resultados: filtre mais para ver todos.</Alerta>
          )}
          {consulta.data.resultados.map((r) => (
            <Cartao key={`${r.aluno.id}-${r.exercicio.id}`} estilo={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexShrink: 1 }}>
                  <Text style={{ fontWeight: '700', color: cores.texto }}>{r.aluno.nome}</Text>
                  <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                    {r.exercicio.nome} · {formatarData(r.dataTeste)}
                    {r.turma ? ` · ${r.turma.nome}` : ''}
                  </Text>
                </View>
                <Text style={{ fontWeight: '800', color: cores.texto }}>
                  PR {formatarKg(r.prKg)} kg
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {r.cargas.map((c) => (
                  <View
                    key={c.percentual}
                    style={{
                      flex: 1,
                      backgroundColor: cores.cinzaClaro,
                      borderRadius: 8,
                      paddingVertical: 5,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '700', color: cores.marcaEscura }}>
                      {c.percentual}%
                    </Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: cores.texto }}>
                      {formatarKg(c.cargaKg)}
                    </Text>
                  </View>
                ))}
              </View>
            </Cartao>
          ))}
        </>
      )}
    </Tela>
  )
}
