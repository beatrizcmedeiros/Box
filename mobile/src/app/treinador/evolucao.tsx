import { useState } from 'react'
import { Text, View } from 'react-native'
import { Chips } from '../../components/seletores'
import { Alerta, Cartao, Carregando, Tela, Titulo } from '../../components/ui'
import { useEvolucaoTurmas } from '../../lib/consultasTreinador'
import { formatarData, formatarKg, formatarPct } from '../../lib/formato'
import { cores } from '../../lib/tema'
import type { Ciclo, EvolucaoTurmas } from '../../lib/tipos'

const semanaCurta = (c: Ciclo) => formatarData(c.semana).replace(/\/(\d{2})(\d{2})$/, '/$2')
const kg = (v: number | null) => (v === null ? '—' : `${formatarKg(v)} kg`)

/** Evolução por semana de teste: resumo, média por turma e evolução de cada aluno. */
export default function EvolucaoDasTurmas() {
  const [exercicioId, setExercicioId] = useState<number | null>(null)
  const evolucao = useEvolucaoTurmas({ exercicioId })

  return (
    <Tela atualizar={{ atualizando: evolucao.isRefetching, aoPuxar: () => evolucao.refetch() }}>
      {evolucao.isPending ? (
        <Carregando />
      ) : evolucao.error ? (
        <Alerta>{evolucao.error.message}</Alerta>
      ) : (
        <>
          <Chips
            rotulo="Exercício"
            opcoes={evolucao.data.exercicios.map((e) => ({ valor: e.id, rotulo: e.nome }))}
            valor={evolucao.data.exercicio?.id ?? null}
            aoEscolher={setExercicioId}
          />
          {!evolucao.data.exercicio || !evolucao.data.resumo ? (
            <Cartao>
              <Text style={{ color: cores.textoSuave, textAlign: 'center' }}>
                Ainda não há testes de carga para mostrar a evolução.
              </Text>
            </Cartao>
          ) : (
            <Conteudo dados={evolucao.data} />
          )}
        </>
      )}
    </Tela>
  )
}

function Conteudo({ dados }: { dados: EvolucaoTurmas }) {
  const resumo = dados.resumo!
  const ciclos = dados.ciclos
  const atual = ciclos.find((c) => c.chave === resumo.cicloAtual)
  // No celular cabem as últimas 3 semanas de teste lado a lado
  const recentes = ciclos.slice(-3)
  const rotuloCiclo = (chave: string | null) => {
    const c = ciclos.find((x) => x.chave === chave)
    return c ? semanaCurta(c) : '—'
  }

  return (
    <>
      <Cartao estilo={{ gap: 10 }}>
        <Titulo>
          {atual ? `Semana de ${formatarData(atual.semana)} · ${atual.rotulo}` : 'Último teste'}
        </Titulo>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Numero rotulo="Alunos" valor={String(resumo.alunosAvaliados)} />
          <Numero rotulo="Média" valor={kg(resumo.mediaAtualKg)} />
          <Numero
            rotulo="Evolução média"
            valor={
              resumo.evolucaoMediaKg === null
                ? '—'
                : `${resumo.evolucaoMediaKg > 0 ? '+' : ''}${formatarKg(resumo.evolucaoMediaKg)} kg`
            }
          />
        </View>
        {resumo.comparaveis > 0 && (
          <Text style={{ fontSize: 13, color: cores.textoSuave }}>
            De {resumo.comparaveis} aluno(s) com teste anterior: {resumo.evoluiram} evoluíram,{' '}
            {resumo.mantiveram} mantiveram e {resumo.cairam} caíram
            {resumo.evolucaoMediaPct !== null
              ? ` (${formatarPct(resumo.evolucaoMediaPct)} em média)`
              : ''}
            .
          </Text>
        )}
      </Cartao>

      <Cartao estilo={{ gap: 4 }}>
        <Titulo>Média por turma</Titulo>
        <Linha celulas={['Turma', ...recentes.map(semanaCurta)]} cabecalho />
        {dados.turmas.map((t) => (
          <Linha
            key={t.turma?.id ?? 'sem-turma'}
            celulas={[
              t.turma?.nome ?? 'Sem turma',
              ...recentes.map((c) => {
                const ponto = t.porCiclo.find((p) => p.ciclo === c.chave)
                return ponto?.mediaKg != null ? formatarKg(ponto.mediaKg) : '—'
              }),
            ]}
          />
        ))}
      </Cartao>

      <Cartao estilo={{ gap: 4 }}>
        <Titulo>Alunos</Titulo>
        {dados.alunos.map((a, i) => (
          <View
            key={a.aluno.id}
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
              <Text style={{ fontWeight: '600', color: cores.texto }}>{a.aluno.nome}</Text>
              <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                {a.turma?.nome ?? 'Sem turma'} · último teste {rotuloCiclo(a.ultimoCiclo)}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', color: cores.texto }}>{kg(a.ultimoKg)}</Text>
              {a.variacaoKg !== null && a.variacaoKg !== 0 && (
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: a.variacaoKg > 0 ? cores.sucesso : cores.erro,
                  }}
                >
                  {a.variacaoKg > 0 ? '+' : '−'}
                  {formatarKg(Math.abs(a.variacaoKg))} kg
                </Text>
              )}
            </View>
          </View>
        ))}
      </Cartao>
    </>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: cores.cinzaClaro, borderRadius: 10, padding: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: cores.textoSuave }}>{rotulo}</Text>
      <Text style={{ fontSize: 15, fontWeight: '800', color: cores.texto }}>{valor}</Text>
    </View>
  )
}

function Linha({ celulas, cabecalho }: { celulas: string[]; cabecalho?: boolean }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        paddingVertical: 6,
        borderBottomWidth: cabecalho ? 1 : 0,
        borderBottomColor: cores.borda,
      }}
    >
      {celulas.map((c, i) => (
        <Text
          key={i}
          numberOfLines={1}
          style={{
            flex: i === 0 ? 2 : 1,
            textAlign: i === 0 ? 'left' : 'right',
            fontSize: 13,
            fontWeight: cabecalho ? '700' : i === 0 ? '600' : '400',
            color: cabecalho ? cores.textoSuave : cores.texto,
          }}
        >
          {c}
        </Text>
      ))}
    </View>
  )
}
