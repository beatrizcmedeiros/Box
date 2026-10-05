import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Alerta, Botao, Campo, Carregando, Etiqueta, Modal, Selecao } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import { useTurmas } from '../../lib/consultas.ts'
import type { Aluno, Turma } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

type Filtros = { busca: string; turmaId: string; ativo: string }
type DadosAluno = { nome: string; email: string; turmaId: number | null; ativo: boolean }

function situacao(aluno: Aluno) {
  if (!aluno.ativo) return <Etiqueta>Inativo</Etiqueta>
  if (aluno.trocarSenha) return <Etiqueta cor="amarelo">Aguardando 1º acesso</Etiqueta>
  return <Etiqueta cor="verde">Ativo</Etiqueta>
}

export function Alunos() {
  const cliente = useQueryClient()
  const [filtros, setFiltros] = useState<Filtros>({ busca: '', turmaId: '', ativo: '' })
  const [editando, setEditando] = useState<Aluno | 'novo' | null>(null)
  const [senhaGerada, setSenhaGerada] = useState<{
    nome: string
    email: string
    senha: string
  } | null>(null)

  const params = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== ''))
  const alunos = useQuery({
    queryKey: ['alunos', filtros],
    queryFn: () => api<Aluno[]>(`/admin/alunos?${params}`),
    placeholderData: (anterior) => anterior,
  })
  const turmas = useTurmas()

  const atualizarLista = () => cliente.invalidateQueries({ queryKey: ['alunos'] })

  const redefinir = useMutation({
    mutationFn: (aluno: Aluno) =>
      api<{ senhaTemporaria: string }>(`/admin/alunos/${aluno.id}/redefinir-senha`, {
        method: 'POST',
      }),
    onSuccess: ({ senhaTemporaria }, aluno) => {
      setSenhaGerada({ nome: aluno.nome, email: aluno.email, senha: senhaTemporaria })
      atualizarLista()
    },
  })

  const excluir = useMutation({
    mutationFn: (aluno: Aluno) => api<void>(`/admin/alunos/${aluno.id}`, { method: 'DELETE' }),
    onSuccess: atualizarLista,
  })

  const mudarFiltro = (campo: keyof Filtros) => (e: { target: { value: string } }) =>
    setFiltros((f) => ({ ...f, [campo]: e.target.value }))

  return (
    <>
      <CabecalhoPagina
        titulo="Alunos"
        subtitulo="Cadastre os alunos do box e gere a senha de primeiro acesso"
        acao={<Botao onClick={() => setEditando('novo')}>+ Novo aluno</Botao>}
      />

      <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-3">
        <Campo
          rotulo="Buscar"
          placeholder="Nome ou e-mail…"
          value={filtros.busca}
          onChange={mudarFiltro('busca')}
          type="search"
        />
        <Selecao rotulo="Turma" value={filtros.turmaId} onChange={mudarFiltro('turmaId')}>
          <option value="">Todas</option>
          {turmas.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Selecao>
        <Selecao rotulo="Situação" value={filtros.ativo} onChange={mudarFiltro('ativo')}>
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </Selecao>
      </div>

      {(redefinir.error || excluir.error) && (
        <div className="mb-4">
          <Alerta>{(redefinir.error ?? excluir.error)!.message}</Alerta>
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
          <p className="p-8 text-center text-sm text-slate-500">Nenhum aluno encontrado.</p>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Turma</th>
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
                  <td className="px-4 py-3">{aluno.turma?.nome ?? '—'}</td>
                  <td className="px-4 py-3">{situacao(aluno)}</td>
                  <td className="space-x-3 px-4 py-3 text-right whitespace-nowrap">
                    <Botao variante="link" onClick={() => setEditando(aluno)}>
                      Editar
                    </Botao>
                    <Botao
                      variante="link"
                      onClick={() =>
                        confirm(
                          `Gerar nova senha temporária para ${aluno.nome}? A senha atual deixará de funcionar.`,
                        ) && redefinir.mutate(aluno)
                      }
                    >
                      Nova senha
                    </Botao>
                    <Botao
                      variante="link"
                      className="!text-red-600"
                      onClick={() =>
                        confirm(
                          `Excluir ${aluno.nome}? Todos os dados e testes de carga do aluno serão apagados.`,
                        ) && excluir.mutate(aluno)
                      }
                    >
                      Excluir
                    </Botao>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editando && (
        <FormularioAluno
          aluno={editando === 'novo' ? null : editando}
          turmas={turmas.data ?? []}
          aoFechar={() => setEditando(null)}
          aoSalvar={(resultado) => {
            setEditando(null)
            atualizarLista()
            if (resultado) setSenhaGerada(resultado)
          }}
        />
      )}

      {senhaGerada && <SenhaTemporaria {...senhaGerada} aoFechar={() => setSenhaGerada(null)} />}
    </>
  )
}

function FormularioAluno({
  aluno,
  turmas,
  aoFechar,
  aoSalvar,
}: {
  aluno: Aluno | null
  turmas: Turma[]
  aoFechar: () => void
  aoSalvar: (senhaGerada?: { nome: string; email: string; senha: string }) => void
}) {
  const [dados, setDados] = useState<DadosAluno>({
    nome: aluno?.nome ?? '',
    email: aluno?.email ?? '',
    turmaId: aluno?.turma?.id ?? null,
    ativo: aluno?.ativo ?? true,
  })
  const [apelidos, setApelidos] = useState(aluno?.apelidos.join(', ') ?? '')
  const corpo = () => ({
    ...dados,
    apelidos: apelidos
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean),
  })

  const salvar = useMutation({
    mutationFn: (): Promise<Aluno | { aluno: Aluno; senhaTemporaria: string }> =>
      aluno
        ? api<Aluno>(`/admin/alunos/${aluno.id}`, { method: 'PUT', body: corpo() })
        : api<{ aluno: Aluno; senhaTemporaria: string }>('/admin/alunos', {
            method: 'POST',
            body: corpo(),
          }),
    onSuccess: (resposta) => {
      if ('senhaTemporaria' in resposta) {
        aoSalvar({
          nome: resposta.aluno.nome,
          email: resposta.aluno.email,
          senha: resposta.senhaTemporaria,
        })
      } else {
        aoSalvar()
      }
    },
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }

  return (
    <Modal titulo={aluno ? 'Editar aluno' : 'Novo aluno'} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          rotulo="Nome completo"
          value={dados.nome}
          onChange={(e) => setDados({ ...dados, nome: e.target.value })}
          erro={erro?.doCampo('nome')}
          autoFocus
        />
        <Campo
          rotulo="E-mail"
          type="email"
          value={dados.email}
          onChange={(e) => setDados({ ...dados, email: e.target.value })}
          erro={erro?.doCampo('email')}
        />
        <Selecao
          rotulo="Turma"
          value={dados.turmaId ?? ''}
          onChange={(e) =>
            setDados({ ...dados, turmaId: e.target.value ? Number(e.target.value) : null })
          }
        >
          <option value="">Sem turma</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
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
        {aluno && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-marca"
              checked={dados.ativo}
              onChange={(e) => setDados({ ...dados, ativo: e.target.checked })}
            />
            Aluno ativo (desmarque para bloquear o acesso)
          </label>
        )}
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
        {!aluno && (
          <p className="text-sm text-slate-500">
            Uma senha temporária será gerada. O aluno deverá trocá-la no primeiro acesso.
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Botao variante="secundario" onClick={aoFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" carregando={salvar.isPending}>
            {aluno ? 'Salvar' : 'Cadastrar aluno'}
          </Botao>
        </div>
      </form>
    </Modal>
  )
}

function SenhaTemporaria({
  nome,
  email,
  senha,
  aoFechar,
}: {
  nome: string
  email: string
  senha: string
  aoFechar: () => void
}) {
  const [copiado, setCopiado] = useState(false)
  const texto = `PR Box — acesso de ${nome}\nE-mail: ${email}\nSenha temporária: ${senha}`

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <Modal titulo="Senha temporária gerada" aoFechar={aoFechar}>
      <div className="space-y-4">
        <p className="text-sm">
          Repasse os dados abaixo para <strong>{nome}</strong>. Por segurança, esta senha{' '}
          <strong>não será exibida novamente</strong>.
        </p>
        <div className="rounded-xl bg-slate-100 p-4 text-sm">
          <p>
            E-mail: <strong>{email}</strong>
          </p>
          <p className="mt-1">
            Senha temporária:{' '}
            <strong className="font-mono text-lg tracking-wider" data-testid="senha-temporaria">
              {senha}
            </strong>
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Botao variante="secundario" onClick={copiar}>
            {copiado ? 'Copiado!' : 'Copiar dados'}
          </Botao>
          <Botao onClick={aoFechar}>Concluir</Botao>
        </div>
      </div>
    </Modal>
  )
}
