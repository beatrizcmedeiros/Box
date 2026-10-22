import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Alerta, Botao, Campo, Carregando, Modal, Selecao } from '../../components/ui.tsx'
import { api, gestao, ErroApi } from '../../lib/api.ts'
import { useLocais, useTurmas } from '../../lib/consultas.ts'
import { useContexto } from '../../lib/contexto.tsx'
import type { Local, Turma } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

export function Turmas() {
  const cliente = useQueryClient()
  const turmas = useTurmas()
  const locais = useLocais()
  const pessoal = useContexto().contexto.tipo === 'professor'
  const [editando, setEditando] = useState<Turma | 'nova' | null>(null)

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['turmas'] })
    cliente.invalidateQueries({ queryKey: ['alunos'] })
    cliente.invalidateQueries({ queryKey: ['locais'] })
  }

  const excluir = useMutation({
    mutationFn: (turma: Turma) => api<void>(gestao(`/turmas/${turma.id}`), { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  return (
    <>
      <CabecalhoPagina
        titulo="Turmas"
        subtitulo={
          pessoal
            ? 'Agrupe os seus alunos por local (ex.: outra academia onde você dá aula) e por turma'
            : 'Horários de aula usados para agrupar os alunos'
        }
        acao={
          <Botao
            onClick={() => setEditando('nova')}
            disabled={pessoal && (locais.data?.length ?? 0) === 0}
          >
            + Nova turma
          </Botao>
        }
      />
      {pessoal && <Locais locais={locais.data ?? []} aoMudar={atualizar} />}
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
                  <p className="font-semibold">
                    {turma.local && <span className="text-slate-500">{turma.local.nome} · </span>}
                    {turma.nome}
                  </p>
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
          locais={pessoal ? (locais.data ?? []) : null}
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
  locais,
  aoFechar,
  aoSalvar,
}: {
  turma: Turma | null
  /** Locais do professor ("Meus alunos"); null na academia */
  locais: Local[] | null
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [nome, setNome] = useState(turma?.nome ?? '')
  const [horario, setHorario] = useState(turma?.horario ?? '')
  const [localId, setLocalId] = useState(turma?.local?.id ?? locais?.[0]?.id ?? null)

  const salvar = useMutation({
    mutationFn: () => {
      const body = { nome, horario: horario || null, ...(locais ? { localId } : {}) }
      return turma
        ? api<Turma>(gestao(`/turmas/${turma.id}`), { method: 'PUT', body })
        : api<Turma>(gestao('/turmas'), { method: 'POST', body })
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
        {locais && (
          <Selecao
            rotulo="Local"
            value={localId ?? ''}
            onChange={(e) => setLocalId(e.target.value ? Number(e.target.value) : null)}
          >
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Selecao>
        )}
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

/** Locais do professor: agrupam turmas (ex.: "Academia X" com as turmas 07h e 19h). */
function Locais({ locais, aoMudar }: { locais: Local[]; aoMudar: () => void }) {
  const [nome, setNome] = useState('')
  const criar = useMutation({
    mutationFn: () => api<Local>('/professor/locais', { method: 'POST', body: { nome } }),
    onSuccess: () => {
      setNome('')
      aoMudar()
    },
  })
  const renomear = useMutation({
    mutationFn: ({ id, novo }: { id: number; novo: string }) =>
      api<Local>(`/professor/locais/${id}`, { method: 'PUT', body: { nome: novo } }),
    onSuccess: aoMudar,
  })
  const excluir = useMutation({
    mutationFn: (id: number) => api<void>(`/professor/locais/${id}`, { method: 'DELETE' }),
    onSuccess: aoMudar,
  })
  const erro = criar.error ?? renomear.error ?? excluir.error

  function enviar(e: FormEvent) {
    e.preventDefault()
    criar.mutate()
  }

  return (
    <section className="mb-4 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-bold">Locais</h2>
      {locais.length === 0 && (
        <p className="text-sm text-slate-500">
          Crie um local (ex.: o nome da academia onde você dá aula) para depois criar as turmas
          dele.
        </p>
      )}
      <ul className="flex flex-wrap gap-2">
        {locais.map((l) => (
          <li
            key={l.id}
            className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-sm"
          >
            <span className="font-semibold">{l.nome}</span>
            <button
              type="button"
              className="text-marca-escura hover:underline"
              onClick={() => {
                const novo = prompt('Novo nome do local', l.nome)?.trim()
                if (novo && novo !== l.nome) renomear.mutate({ id: l.id, novo })
              }}
            >
              Renomear
            </button>
            <button
              type="button"
              className="text-red-600 hover:underline"
              onClick={() =>
                confirm(
                  `Excluir ${l.nome}? As turmas dele são removidas; os alunos continuam vinculados.`,
                ) && excluir.mutate(l.id)
              }
            >
              Excluir
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={enviar} className="flex items-end gap-3" noValidate>
        <Campo
          rotulo="Novo local"
          placeholder="Ex.: Academia X"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          className="flex-1"
        />
        <Botao
          type="submit"
          variante="secundario"
          carregando={criar.isPending}
          disabled={!nome.trim()}
        >
          Adicionar
        </Botao>
      </form>
      {erro && <Alerta>{erro.message}</Alerta>}
    </section>
  )
}
