import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Alerta, Botao, Carregando } from '../../components/ui.tsx'
import { api } from '../../lib/api.ts'
import { formatarData } from '../../lib/formato.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

type Professor = { id: number; nome: string; email: string; desde: string }

/** Professores da academia (só para a conta da academia). */
export function Professores() {
  const cliente = useQueryClient()
  const professores = useQuery({
    queryKey: ['professores'],
    queryFn: () => api<Professor[]>('/academia/professores'),
  })
  const remover = useMutation({
    mutationFn: (id: number) => api<void>(`/academia/professores/${id}`, { method: 'DELETE' }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['professores'] }),
  })

  return (
    <>
      <CabecalhoPagina
        titulo="Professores"
        subtitulo="Os professores da academia veem todos os alunos e turmas dela."
        acao={
          <Link to="/treinador/codigos" className="text-sm font-semibold text-marca-escura">
            Código para professores →
          </Link>
        }
      />
      {professores.isPending ? (
        <Carregando />
      ) : professores.error ? (
        <Alerta>{professores.error.message}</Alerta>
      ) : professores.data.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-sm text-slate-500 shadow-sm">
          Nenhum professor ainda. Gere o código para professores e passe para eles.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-2xl bg-white px-4 shadow-sm">
          {remover.error && <Alerta>{remover.error.message}</Alerta>}
          {professores.data.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{p.nome}</p>
                <p className="text-sm text-slate-500">
                  {p.email} · desde {formatarData(p.desde.slice(0, 10))}
                </p>
              </div>
              <Botao
                variante="link"
                onClick={() =>
                  confirm(`Remover ${p.nome}? Ele deixa de ver os alunos da academia.`) &&
                  remover.mutate(p.id)
                }
              >
                Remover
              </Botao>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
