import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { EditarPr } from '../../components/EditarPr.tsx'
import { Alerta, Botao, Carregando, Modal } from '../../components/ui.tsx'
import { api, gestao } from '../../lib/api.ts'
import { formatarData, formatarKg } from '../../lib/formato.ts'
import type { Aluno, PrDoAluno } from '../../lib/tipos.ts'

/** Todos os PRs de um aluno vinculado, com a opção de corrigir a data ou a carga. */
export function PrsDoAluno({ aluno, aoFechar }: { aluno: Aluno; aoFechar: () => void }) {
  const cliente = useQueryClient()
  const [editando, setEditando] = useState<PrDoAluno | null>(null)
  const prs = useQuery({
    queryKey: ['prs-do-aluno', aluno.id],
    queryFn: () => api<PrDoAluno[]>(gestao(`/alunos/${aluno.id}/prs`)),
  })

  if (editando) {
    return (
      <EditarPr
        titulo={`Editar PR de ${editando.exercicio.nome}`}
        pr={editando}
        caminho={gestao(`/alunos/${aluno.id}/prs/${editando.id}`)}
        aoFechar={() => setEditando(null)}
        aoSalvar={() => {
          setEditando(null)
          // PR alterado muda percentuais, consultas e evolução
          for (const chave of [
            'prs-do-aluno',
            'percentuais',
            'cargas',
            'evolucao',
            'lancamentos',
          ]) {
            cliente.invalidateQueries({ queryKey: [chave] })
          }
        }}
      />
    )
  }

  return (
    <Modal titulo={`PRs de ${aluno.nome}`} aoFechar={aoFechar}>
      {prs.isPending ? (
        <Carregando />
      ) : prs.error ? (
        <Alerta>{prs.error.message}</Alerta>
      ) : prs.data.length === 0 ? (
        <p className="text-sm text-slate-500">Este aluno ainda não tem PRs registrados.</p>
      ) : (
        <ul>
          {prs.data.map((pr) => (
            <li
              key={pr.id}
              className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0"
            >
              <span>
                <span className="block font-semibold">{pr.exercicio.nome}</span>
                <span className="text-slate-500">{formatarData(pr.dataTeste)}</span>
              </span>
              <span className="flex items-center gap-3">
                <strong className="tabular-nums">{formatarKg(pr.cargaKg)} kg</strong>
                <Botao
                  variante="link"
                  aria-label={`Editar ${pr.exercicio.nome} de ${formatarData(pr.dataTeste)}`}
                  onClick={() => setEditando(pr)}
                >
                  Editar
                </Botao>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
