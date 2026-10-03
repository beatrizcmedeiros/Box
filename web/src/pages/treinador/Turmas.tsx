import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Alerta, Botao, Campo, Carregando, Modal } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import { useTurmas } from '../../lib/consultas.ts'
import type { Turma } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

export function Turmas() {
  const cliente = useQueryClient()
  const turmas = useTurmas()
  const [editando, setEditando] = useState<Turma | 'nova' | null>(null)

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['turmas'] })
    cliente.invalidateQueries({ queryKey: ['alunos'] })
  }

  const excluir = useMutation({
    mutationFn: (turma: Turma) => api<void>(`/admin/turmas/${turma.id}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  return (
    <>
      <CabecalhoPagina
        titulo="Turmas"
        subtitulo="Horários de aula usados para agrupar os alunos"
        acao={<Botao onClick={() => setEditando('nova')}>+ Nova turma</Botao>}
      />
      {excluir.error && (
        <div className="mb-4">
          <Alerta>{excluir.error.message}</Alerta>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm">
        {turmas.isPending ? (
          <Carregando />
        ) : turmas.error ? (
          <div className="p-4">
            <Alerta>{turmas.error.message}</Alerta>
          </div>
        ) : turmas.data.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Nenhuma turma cadastrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {turmas.data.map((turma) => (
              <li
                key={turma.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
              >
                <div>
                  <p className="font-semibold">{turma.nome}</p>
                  <p className="text-sm text-slate-500">
                    {turma.horario ?? 'Sem horário'} · {turma.totalAlunos}{' '}
                    {turma.totalAlunos === 1 ? 'aluno' : 'alunos'}
                  </p>
                </div>
                <div className="space-x-3">
                  <Botao variante="link" onClick={() => setEditando(turma)}>
                    Editar
                  </Botao>
                  <Botao
                    variante="link"
                    className="!text-red-600"
                    onClick={() =>
                      confirm(
                        `Excluir ${turma.nome}?${turma.totalAlunos ? ` Os ${turma.totalAlunos} aluno(s) ficarão sem turma.` : ''}`,
                      ) && excluir.mutate(turma)
                    }
                  >
                    Excluir
                  </Botao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editando && (
        <FormularioTurma
          turma={editando === 'nova' ? null : editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null)
            atualizar()
          }}
        />
      )}
    </>
  )
}

function FormularioTurma({
  turma,
  aoFechar,
  aoSalvar,
}: {
  turma: Turma | null
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [nome, setNome] = useState(turma?.nome ?? '')
  const [horario, setHorario] = useState(turma?.horario ?? '')

  const salvar = useMutation({
    mutationFn: () => {
      const body = { nome, horario: horario || null }
      return turma
        ? api<Turma>(`/admin/turmas/${turma.id}`, { method: 'PUT', body })
        : api<Turma>('/admin/turmas', { method: 'POST', body })
    },
    onSuccess: aoSalvar,
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }

  return (
    <Modal titulo={turma ? 'Editar turma' : 'Nova turma'} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          rotulo="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erro?.doCampo('nome')}
          placeholder="Ex.: Turma 18h"
          autoFocus
        />
        <Campo
          rotulo="Horário"
          type="time"
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          erro={erro?.doCampo('horario')}
        />
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
        <div className="flex justify-end gap-3">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={salvar.isPending}>
            Salvar
          </Botao>
        </div>
      </form>
    </Modal>
  )
}
