import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link } from 'react-router'
import { PrsDoAluno } from './PrsDoAluno.tsx'
import { Alerta, Botao, Campo, Carregando, Etiqueta, Modal, Selecao } from '../../components/ui.tsx'
import { api, ErroApi, gestao } from '../../lib/api.ts'
import { useLocais, useTurmas } from '../../lib/consultas.ts'
import { useContexto } from '../../lib/contexto.tsx'
import type { Aluno, Local, Turma } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

type Filtros = { busca: string; turmaId: string; localId: string }

/**
 * Alunos vinculados ao contexto (academia ou "Meus alunos"). Cada aluno cria a própria
 * conta e se vincula pelo código; aqui o professor organiza (turma, local, apelidos) e
 * pode desfazer o vínculo.
 */
export function Alunos() {
  const cliente = useQueryClient()
  const { contexto } = useContexto()
  const pessoal = contexto.tipo === 'professor'
  const [filtros, setFiltros] = useState<Filtros>({ busca: '', turmaId: '', localId: '' })
  const [editando, setEditando] = useState<Aluno | null>(null)
  const [vendoPrs, setVendoPrs] = useState<Aluno | null>(null)

  const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== ''))
  const alunos = useQuery({
    queryKey: ['alunos', filtros],
    queryFn: () => api<Aluno[]>(gestao(`/alunos?${params}`)),
    placeholderData: (anterior) => anterior,
  })
  const turmas = useTurmas()
  const locais = useLocais()

  const atualizarLista = () => cliente.invalidateQueries({ queryKey: ['alunos'] })

  const desvincular = useMutation({
    mutationFn: (aluno: Aluno) => api<void>(gestao(`/alunos/${aluno.id}`), { method: 'DELETE' }),
    onSuccess: atualizarLista,
  })

  const mudarFiltro = (campo: keyof Filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [campo]: e.target.value }))

  return (
    <>
      <CabecalhoPagina
        titulo="Alunos"
        subtitulo={
          pessoal
            ? 'Alunos vinculados diretamente a você. Só você vê os PRs deles.'
            : `Alunos vinculados a ${contexto.nome}. Todos os professores da academia veem.`
        }
        acao={
          <Link to="/treinador/codigos" className="text-sm font-semibold text-marca-escura">
            Como o aluno se vincula →
          </Link>
        }
      />

      <div
        className={`mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm ${pessoal ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}
      >
        <Campo
          rotulo="Buscar"
          placeholder="Nome ou e-mail…"
          value={filtros.busca}
          onChange={mudarFiltro('busca')}
          type="search"
        />
        {pessoal && (
          <Selecao rotulo="Local" value={filtros.localId} onChange={mudarFiltro('localId')}>
            <option value="">Todos</option>
            {locais.data?.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Selecao>
        )}
        <Selecao rotulo="Turma" value={filtros.turmaId} onChange={mudarFiltro('turmaId')}>
          <option value="">Todas</option>
          {turmas.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.local ? `${t.local.nome} · ${t.nome}` : t.nome}
            </option>
          ))}
        </Selecao>
      </div>

      {desvincular.error && (
        <div className="mb-4">
          <Alerta>{desvincular.error.message}</Alerta>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {alunos.isPending ? (
          <Carregando />
        ) : alunos.error ? (
          <div className="p-4">
            <Alerta>{alunos.error.message}</Alerta>
          </div>
        ) : alunos.data.length === 0 ? (
          <div className="space-y-2 p-8 text-center text-sm text-slate-500">
            <p>Nenhum aluno vinculado.</p>
            <p>
              Gere um código em{' '}
              <Link to="/treinador/codigos" className="font-semibold text-marca-escura">
                Códigos de vínculo
              </Link>{' '}
              e passe para os alunos: eles digitam o código no app ou na web.
            </p>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">{pessoal ? 'Local · turma' : 'Turma'}</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {alunos.data.map((aluno) => (
                <tr key={aluno.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold">{aluno.nome}</p>
                    <p className="text-slate-500">{aluno.email}</p>
                    {aluno.apelidos.length > 0 && (
                      <p className="text-xs text-slate-500">
                        Na lista: {aluno.apelidos.join(', ')}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {[aluno.local?.nome, aluno.turma?.nome].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {aluno.primeiroAcessoPendente ? (
                      <Etiqueta cor="amarelo">Aguardando 1º acesso</Etiqueta>
                    ) : (
                      <Etiqueta cor="verde">Ativo</Etiqueta>
                    )}
                  </td>
                  <td className="space-x-3 px-4 py-3 text-right whitespace-nowrap">
                    <Botao variante="link" onClick={() => setVendoPrs(aluno)}>
                      PRs
                    </Botao>
                    <Botao variante="link" onClick={() => setEditando(aluno)}>
                      Organizar
                    </Botao>
                    <Botao
                      variante="link"
                      className="!text-red-600"
                      onClick={() =>
                        confirm(
                          `Desvincular ${aluno.nome}? Você deixa de ver os PRs dele; a conta e os PRs continuam com o aluno.`,
                        ) && desvincular.mutate(aluno)
                      }
                    >
                      Desvincular
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {vendoPrs && <PrsDoAluno aluno={vendoPrs} aoFechar={() => setVendoPrs(null)} />}

      {editando && (
        <OrganizarAluno
          aluno={editando}
          pessoal={pessoal}
          turmas={turmas.data ?? []}
          locais={locais.data ?? []}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null)
            atualizarLista()
          }}
        />
      )}
    </>
  )
}

/** Turma, local e apelidos do aluno neste contexto (não altera a conta do aluno). */
function OrganizarAluno({
  aluno,
  pessoal,
  turmas,
  locais,
  aoFechar,
  aoSalvar,
}: {
  aluno: Aluno
  pessoal: boolean
  turmas: Turma[]
  locais: Local[]
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [turmaId, setTurmaId] = useState<number | null>(aluno.turma?.id ?? null)
  const [localId, setLocalId] = useState<number | null>(aluno.local?.id ?? null)
  const [apelidos, setApelidos] = useState(aluno.apelidos.join(', '))

  // No "Meus alunos", as turmas mostradas são as do local escolhido
  const turmasVisiveis = pessoal && localId ? turmas.filter((t) => t.local?.id === localId) : turmas

  const salvar = useMutation({
    mutationFn: () =>
      api<Aluno>(gestao(`/alunos/${aluno.id}`), {
        method: 'PUT',
        body: {
          turmaId,
          localId: pessoal ? localId : null,
          apelidos: apelidos
            .split(',')
            .map((a) => a.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: aoSalvar,
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }

  return (
    <Modal titulo={`Organizar ${aluno.nome}`} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        {pessoal && (
          <Selecao
            rotulo="Local"
            value={localId ?? ''}
            onChange={(e) => {
              setLocalId(e.target.value ? Number(e.target.value) : null)
              setTurmaId(null)
            }}
          >
            <option value="">Sem local</option>
            {locais.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nome}
              </option>
            ))}
          </Selecao>
        )}
        <Selecao
          rotulo="Turma"
          value={turmaId ?? ''}
          onChange={(e) => setTurmaId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Sem turma</option>
          {turmasVisiveis.map((t) => (
            <option key={t.id} value={t.id}>
              {t.local && !localId ? `${t.local.nome} · ${t.nome}` : t.nome}
            </option>
          ))}
        </Selecao>
        <Campo
          rotulo="Apelidos (opcional)"
          value={apelidos}
          onChange={(e) => setApelidos(e.target.value)}
          erro={erro?.doCampo('apelidos')}
          dica="Como o aluno aparece na lista do teste de força, separados por vírgula. Ex.: Lurdinha, Lu"
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
