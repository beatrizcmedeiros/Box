import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alerta, Botao, Carregando, Etiqueta } from '../../../components/ui.tsx'
import { api } from '../../../lib/api.ts'
import { formatarData } from '../../../lib/formato.ts'
import type { Importacao } from '../../../lib/tipos.ts'

export function HistoricoImportacoes() {
  const cliente = useQueryClient()
  const importacoes = useQuery({
    queryKey: ['importacoes'],
    queryFn: () => api<Importacao[]>('/admin/importacoes'),
  })

  const desfazer = useMutation({
    mutationFn: (importacao: Importacao) =>
      api<{ removidos: number }>(`/admin/importacoes/${importacao.id}`, { method: 'DELETE' }),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: ['importacoes'] })
    },
  })

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold">Importações anteriores</h2>
      {desfazer.error && (
        <div className="mb-3">
          <Alerta>{desfazer.error.message}</Alerta>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {importacoes.isPending ? (
          <Carregando />
        ) : importacoes.error ? (
          <div className="p-4">
            <Alerta>{importacoes.error.message}</Alerta>
          </div>
        ) : importacoes.data.length === 0 ? (
          <p className="p-6 text-center text-sm text-slate-500">Nenhuma importação feita ainda.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Teste de</th>
                <th className="px-4 py-3">Arquivo</th>
                <th className="px-4 py-3">Turma</th>
                <th className="px-4 py-3">Resultados</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {importacoes.data.map((i) => (
                <tr key={i.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-semibold">{formatarData(i.dataTeste)}</td>
                  <td className="px-4 py-3">
                    {i.nomeArquivo}
                    <span className="block text-xs text-slate-500">
                      por {i.treinador} em{' '}
                      {new Date(i.criadoEm).toLocaleString('pt-BR', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </span>
                  </td>
                  <td className="px-4 py-3">{i.turma?.nome ?? 'Todas'}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {i.status === 'CANCELADA' ? '—' : i.resultadosAtuais}
                  </td>
                  <td className="px-4 py-3">
                    {i.status === 'CANCELADA' ? (
                      <Etiqueta>Desfeita</Etiqueta>
                    ) : (
                      <Etiqueta cor="verde">Importada</Etiqueta>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {i.status === 'CONFIRMADA' && (
                      <Botao
                        variante="link"
                        className="!text-red-600"
                        onClick={() =>
                          confirm(
                            `Desfazer a importação de ${formatarData(i.dataTeste)}? Os ${i.resultadosAtuais} resultado(s) gravado(s) por ela serão removidos dos alunos.`,
                          ) && desfazer.mutate(i)
                        }
                      >
                        Desfazer
                      </Botao>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
