import { router } from 'expo-router'
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { Etiqueta } from '../../../components/seletores'
import { Alerta, Botao, Cartao, Carregando, Tela, Titulo } from '../../../components/ui'
import { useVisaoGeral } from '../../../lib/consultasTreinador'
import { useContexto } from '../../../lib/contexto'
import { formatarData } from '../../../lib/formato'
import { useUsuario } from '../../../lib/sessao'
import { cores } from '../../../lib/tema'

// Meta do piloto: pelo menos 70% dos alunos com PR cadastrado (a mesma da versão web)
const META_ALUNOS_COM_PR = 70

/** Visão geral: adesão dos alunos ao PR Box. */
export default function VisaoGeral() {
  const { data: usuario } = useUsuario()
  const { contexto } = useContexto()
  const visao = useVisaoGeral()

  return (
    <Tela atualizar={{ atualizando: visao.isRefetching, aoPuxar: () => visao.refetch() }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: cores.texto }}>
        Olá, {usuario?.nome.split(' ')[0] ?? 'treinador'}
      </Text>
      <Text style={{ color: cores.textoSuave }}>Trabalhando em {contexto.nome}</Text>
      {visao.isPending ? (
        <Carregando />
      ) : visao.error ? (
        <Alerta>{visao.error.message}</Alerta>
      ) : visao.data.alunos.ativos === 0 ? (
        <Cartao estilo={{ gap: 10 }}>
          <Text style={{ fontWeight: '700', color: cores.texto }}>Comece trazendo os alunos.</Text>
          <Text style={{ color: cores.textoSuave }}>
            Gere o código de vínculo e passe para os alunos: cada um cria a conta no app e digita o
            código em Vínculos.
          </Text>
          <Botao aoPressionar={() => router.push('/treinador/codigos')}>Gerar código</Botao>
        </Cartao>
      ) : (
        <Conteudo dados={visao.data} />
      )}
    </Tela>
  )
}

function Conteudo({ dados }: { dados: NonNullable<ReturnType<typeof useVisaoGeral>['data']> }) {
  const { alunos, ultimos30Dias, ultimaImportacao, alunosSemPr } = dados
  const metaAtingida = alunos.percentualComPr >= META_ALUNOS_COM_PR

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Indicador rotulo="Alunos ativos" valor={String(alunos.ativos)} />
        <Indicador
          rotulo="1º acesso feito"
          valor={`${alunos.primeiroAcessoConcluido} de ${alunos.ativos}`}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Indicador
          rotulo="Alunos com PR"
          valor={`${alunos.percentualComPr}%`}
          detalhe={
            <Etiqueta cor={metaAtingida ? 'verde' : 'amarelo'}>
              {metaAtingida ? 'Meta atingida' : `Meta: ${META_ALUNOS_COM_PR}%`}
            </Etiqueta>
          }
        />
        <Indicador
          rotulo="Registros em 30 dias"
          valor={String(ultimos30Dias.registradosPeloAluno + ultimos30Dias.importados)}
          detalhe={
            <Text style={{ fontSize: 12, color: cores.textoSuave }}>
              {ultimos30Dias.registradosPeloAluno} pelos alunos · {ultimos30Dias.importados} pelo
              treinador
            </Text>
          }
        />
      </View>

      <Cartao estilo={{ gap: 8 }}>
        <Text style={{ fontWeight: '700', color: cores.texto }}>
          Último teste de força importado
        </Text>
        <Text style={{ color: cores.textoSuave }}>
          {ultimaImportacao
            ? `Teste de ${formatarData(ultimaImportacao.dataTeste)} · ${ultimaImportacao.resultados} resultado(s)`
            : 'Nenhuma lista importada ainda.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Botao
            variante="secundario"
            aoPressionar={() => router.push('/treinador/importar')}
            estilo={{ flex: 1 }}
          >
            Importar lista
          </Botao>
          <Botao
            variante="secundario"
            aoPressionar={() => router.push('/treinador/consultar')}
            estilo={{ flex: 1 }}
          >
            Consultar cargas
          </Botao>
        </View>
      </Cartao>

      <Cartao estilo={{ gap: 4 }}>
        <Text style={{ fontWeight: '700', color: cores.texto, marginBottom: 4 }}>
          Alunos ainda sem PR
        </Text>
        {alunosSemPr.length === 0 ? (
          <Text style={{ color: cores.textoSuave }}>
            Todos os alunos ativos têm pelo menos um PR. 🎉
          </Text>
        ) : (
          alunosSemPr.map((a, i) => (
            <View
              key={a.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: cores.cinzaClaro,
              }}
            >
              <Text style={{ flexShrink: 1, color: cores.texto }}>
                {a.nome}
                {a.turma && <Text style={{ color: cores.textoSuave }}> · {a.turma}</Text>}
              </Text>
              {a.aguardandoPrimeiroAcesso && <Etiqueta cor="amarelo">Sem 1º acesso</Etiqueta>}
            </View>
          ))
        )}
      </Cartao>
    </>
  )
}

function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string
  valor: string
  detalhe?: ReactNode
}) {
  return (
    <Cartao estilo={{ flex: 1, gap: 4 }}>
      <Titulo>{rotulo}</Titulo>
      <Text style={{ fontSize: 22, fontWeight: '800', color: cores.texto }}>{valor}</Text>
      {detalhe}
    </Cartao>
  )
}
