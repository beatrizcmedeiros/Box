import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { useUsuario } from '../../auth/sessao.ts'
import { Alerta, Carregando, Etiqueta } from '../../components/ui.tsx'
import { api } from '../../lib/api.ts'
import { formatarData } from '../../lib/formato.ts'
import type { VisaoGeral as Dados } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

// Meta do piloto (plano, seção 11): pelo menos 70% dos alunos com PR cadastrado
const META_ALUNOS_COM_PR = 70

export function VisaoGeral() {
  const { data: usuario } = useUsuario()
  const visao = useQuery({
    queryKey: ['visao-geral'],
    queryFn: () => api<Dados>('/admin/visao-geral'),
  })

  return (
    <>
      <CabecalhoPagina
        titulo={`Olá, ${usuario?.nome.split(' ')[0] ?? 'treinador'}`}
        subtitulo="Acompanhe a adesão dos alunos ao PR Box"
      />
      {visao.isPending ? (
        <Carregando />
      ) : visao.error ? (
        <Alerta>{visao.error.message}</Alerta>
      ) : (
        <Conteudo dados={visao.data} />
      )}
    </>
  )
}

function Conteudo({ dados }: { dados: Dados }) {
  const { alunos, ultimos30Dias, ultimaImportacao, alunosSemPr } = dados
  const metaAtingida = alunos.percentualComPr >= META_ALUNOS_COM_PR

  if (alunos.ativos === 0) {
    return (
      <div className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
        <p className="font-semibold">Comece cadastrando os alunos do box.</p>
        <p className="text-sm text-slate-600">
          Cada aluno recebe uma senha temporária para o primeiro acesso. Depois, importe a lista do
          último teste de força para que todos já entrem vendo suas cargas.
        </p>
        <Link
          to="/treinador/alunos"
          className="inline-block font-semibold text-marca-escura hover:underline"
        >
          Cadastrar alunos →
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador rotulo="Alunos ativos" valor={String(alunos.ativos)} />
        <Indicador
          rotulo="Fizeram o primeiro acesso"
          valor={`${alunos.primeiroAcessoConcluido} de ${alunos.ativos}`}
        />
        <Indicador
          rotulo="Alunos com PR"
          valor={`${alunos.percentualComPr}%`}
          detalhe={
            <Etiqueta cor={metaAtingida ? 'verde' : 'amarelo'}>
              {metaAtingida ? 'Meta do piloto atingida' : `Meta: ${META_ALUNOS_COM_PR}%`}
            </Etiqueta>
          }
        />
        <Indicador
          rotulo="Registros nos últimos 30 dias"
          valor={String(ultimos30Dias.registradosPeloAluno + ultimos30Dias.importados)}
          detalhe={
            <span className="text-xs text-slate-500">
              {ultimos30Dias.registradosPeloAluno} pelos alunos · {ultimos30Dias.importados}{' '}
              importados
            </span>
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Último teste de força importado</h2>
          {ultimaImportacao ? (
            <p className="mt-1 text-sm text-slate-600">
              Teste de {formatarData(ultimaImportacao.dataTeste)} · {ultimaImportacao.resultados}{' '}
              resultado(s)
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">Nenhuma lista importada ainda.</p>
          )}
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-semibold">
            <Link to="/treinador/importar" className="text-marca-escura hover:underline">
              Importar lista do teste →
            </Link>
            <Link to="/treinador/consultar" className="text-marca-escura hover:underline">
              Consultar cargas →
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Alunos ainda sem PR</h2>
          {alunosSemPr.length === 0 ? (
            <p className="mt-1 text-sm text-slate-600">
              Todos os alunos ativos têm pelo menos um PR. 🎉
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100 text-sm">
              {alunosSemPr.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    {a.nome}
                    {a.turma && <span className="text-slate-500"> · {a.turma}</span>}
                  </span>
                  {a.aguardandoPrimeiroAcesso && <Etiqueta cor="amarelo">Sem 1º acesso</Etiqueta>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function Indicador({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string
  valor: string
  detalhe?: React.ReactNode
}) {
  return (
    <div className="rounded-2xl bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">{rotulo}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{valor}</p>
      {detalhe && <div className="mt-1">{detalhe}</div>}
    </div>
  )
}
