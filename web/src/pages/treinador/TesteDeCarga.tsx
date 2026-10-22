import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { Alerta, Botao, Campo, Carregando, Etiqueta, Selecao } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import { useExercicios, useTurmas } from '../../lib/consultas.ts'
import { formatarData, formatarKg, hojeIso, lerNumero } from '../../lib/formato.ts'
import type { AlunoParaLancar, ResultadoLancamento } from '../../lib/tipos.ts'
import { cargaValida } from './importacao/estado.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

type Modo = 'turma' | 'aluno'

const kg = (v: number) => `${formatarKg(v)} kg`
const dataCurta = (iso: string) => formatarData(iso).replace(/\/(\d{2})(\d{2})$/, '/$2')

/** Espera o usuário parar de digitar antes de pesquisar. */
function useAtrasado<T>(valor: T, ms = 300) {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), ms)
    return () => clearTimeout(espera)
  }, [valor, ms])
  return atrasado
}

/**
 * Teste de carga: ao final da aula o treinador escolhe a data (hoje por padrão), o exercício
 * e a turma, e lança a carga máxima de cada aluno na mesma tela — ou de um aluno por vez.
 */
export function TesteDeCarga() {
  const exercicios = useExercicios()
  const turmas = useTurmas()
  const ativos = (exercicios.data ?? []).filter((e) => e.ativo)

  const [data, setData] = useState(hojeIso())
  const [exercicioId, setExercicioId] = useState('')
  const [modo, setModo] = useState<Modo>('turma')
  const [mensagem, setMensagem] = useState<string | null>(null)

  const exercicioEscolhido = exercicioId || (ativos[0] ? String(ativos[0].id) : '')
  const nomeExercicio = ativos.find((e) => String(e.id) === exercicioEscolhido)?.nome

  return (
    <>
      <CabecalhoPagina
        titulo="Teste de carga"
        subtitulo="Lance a carga máxima dos alunos no dia do teste — por turma, de uma vez, ou um aluno por vez"
      />

      <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-[12rem_1fr]">
        <Campo
          rotulo="Data do teste"
          type="date"
          value={data}
          max={hojeIso()}
          onChange={(e) => {
            setData(e.target.value)
            setMensagem(null)
          }}
        />
        <Selecao
          rotulo="Exercício"
          value={exercicioEscolhido}
          onChange={(e) => {
            setExercicioId(e.target.value)
            setMensagem(null)
          }}
        >
          {ativos.length === 0 && <option value="">Cadastre um exercício primeiro</option>}
          {ativos.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
            </option>
          ))}
        </Selecao>
      </div>

      <div role="tablist" aria-label="Forma de lançamento" className="mb-4 flex gap-2">
        {(
          [
            ['turma', 'Por turma'],
            ['aluno', 'Por aluno'],
          ] as const
        ).map(([valor, rotulo]) => (
          <button
            key={valor}
            type="button"
            role="tab"
            aria-selected={modo === valor}
            onClick={() => {
              setModo(valor)
              setMensagem(null)
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              modo === valor ? 'bg-fundo-escuro text-white' : 'bg-white text-slate-700 shadow-sm'
            }`}
          >
            {rotulo}
          </button>
        ))}
      </div>

      {mensagem && (
        <div className="mb-4">
          <Alerta tipo="sucesso">{mensagem}</Alerta>
        </div>
      )}

      {!exercicioEscolhido || !data ? (
        exercicios.isPending ? (
          <Carregando />
        ) : null
      ) : modo === 'turma' ? (
        <LancamentoPorTurma
          // Trocar data ou exercício recomeça a digitação
          key={`${data}-${exercicioEscolhido}`}
          data={data}
          exercicioId={exercicioEscolhido}
          nomeExercicio={nomeExercicio ?? ''}
          turmas={turmas.data ?? []}
          aoSalvar={setMensagem}
        />
      ) : (
        <LancamentoPorAluno
          key={`${data}-${exercicioEscolhido}`}
          data={data}
          exercicioId={exercicioEscolhido}
          nomeExercicio={nomeExercicio ?? ''}
          aoSalvar={setMensagem}
        />
      )}
    </>
  )
}

function useAlunosParaLancar(
  params: { data: string; exercicioId: string; turmaId?: string; busca?: string },
  ativo = true,
) {
  const consulta = new URLSearchParams({ data: params.data, exercicioId: params.exercicioId })
  if (params.turmaId) consulta.set('turmaId', params.turmaId)
  if (params.busca) consulta.set('busca', params.busca)
  return useQuery({
    queryKey: ['lancamentos', consulta.toString()],
    queryFn: () => api<{ alunos: AlunoParaLancar[] }>(`/admin/lancamentos?${consulta}`),
    placeholderData: keepPreviousData,
    enabled: ativo,
  })
}

function useSalvarLancamentos(
  data: string,
  exercicioId: string,
  aoSalvar: (mensagem: string) => void,
) {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (resultados: { usuarioId: number; cargaKg: number }[]) =>
      api<ResultadoLancamento>('/admin/lancamentos', {
        method: 'POST',
        body: { dataTeste: data, exercicioId: Number(exercicioId), resultados },
      }),
    onSuccess: (r) => {
      const total = r.criados + r.atualizados
      const partes = [`${total} carga(s) salva(s) para ${formatarData(data)}`]
      if (r.atualizados) partes.push(`${r.atualizados} corrigida(s)`)
      if (r.novosRecordes.length) {
        partes.push(
          `Novo recorde: ${r.novosRecordes.map((n) => `${n.nome.split(' ')[0]} (${kg(n.cargaKg)})`).join(', ')}`,
        )
      }
      aoSalvar(`${partes.join(' · ')}.`)
      for (const chave of ['lancamentos', 'cargas', 'evolucao', 'visao-geral']) {
        cliente.invalidateQueries({ queryKey: [chave] })
      }
    },
  })
}

function useExcluirLancamento() {
  const cliente = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<void>(`/admin/lancamentos/${id}`, { method: 'DELETE' }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: ['lancamentos'] }),
  })
}

function LancamentoPorTurma({
  data,
  exercicioId,
  nomeExercicio,
  turmas,
  aoSalvar,
}: {
  data: string
  exercicioId: string
  nomeExercicio: string
  turmas: { id: number; nome: string }[]
  aoSalvar: (mensagem: string) => void
}) {
  const [turmaId, setTurmaId] = useState(turmas[0] ? String(turmas[0].id) : '')
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useAtrasado(busca.trim())
  // Cargas digitadas (por aluno), mantidas ao filtrar ou trocar de turma até salvar
  const [digitadas, setDigitadas] = useState<Record<number, string>>({})
  const entradas = useRef(new Map<number, HTMLInputElement>())

  const alunos = useAlunosParaLancar({ data, exercicioId, turmaId, busca: buscaAtrasada })
  const salvar = useSalvarLancamentos(data, exercicioId, (m) => {
    setDigitadas({})
    aoSalvar(m)
  })
  const excluir = useExcluirLancamento()

  const lista = alunos.data?.alunos ?? []
  const valorSalvo = (a: AlunoParaLancar) =>
    a.lancamento ? String(a.lancamento.cargaKg).replace('.', ',') : ''
  const pendentes = Object.entries(digitadas)
    .map(([id, texto]) => ({ usuarioId: Number(id), texto }))
    .filter(({ texto }) => texto.trim() !== '')
  const invalidas = pendentes.filter(({ texto }) => !cargaValida(texto))
  const prontas = pendentes.filter(({ texto }) => cargaValida(texto))

  function aoTeclar(e: KeyboardEvent<HTMLInputElement>, indice: number) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const proximo = lista[indice + 1]
    if (proximo) entradas.current.get(proximo.aluno.id)?.focus()
    else if (prontas.length && !invalidas.length)
      salvar.mutate(
        prontas.map(({ usuarioId, texto }) => ({ usuarioId, cargaKg: lerNumero(texto) })),
      )
  }

  return (
    <section className="rounded-2xl bg-white shadow-sm" aria-label="Lançamento por turma">
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2">
        <Selecao rotulo="Turma" value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
          <option value="">Todas as turmas</option>
          {turmas.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Selecao>
        <Campo
          rotulo="Pesquisar aluno"
          type="search"
          placeholder="Nome ou apelido…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {alunos.isPending ? (
        <Carregando />
      ) : alunos.error ? (
        <div className="p-4">
          <Alerta>{alunos.error.message}</Alerta>
        </div>
      ) : lista.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">Nenhum aluno ativo encontrado.</p>
      ) : (
        <div className={`overflow-x-auto ${alunos.isPlaceholderData ? 'opacity-60' : ''}`}>
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-2">Aluno</th>
                <th className="px-4 py-2 text-right">PR anterior</th>
                <th className="w-36 px-4 py-2">Carga de hoje (kg)</th>
                <th className="px-4 py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((a, indice) => {
                const id = a.aluno.id
                const texto = digitadas[id] ?? valorSalvo(a)
                const editado = digitadas[id] !== undefined && digitadas[id] !== valorSalvo(a)
                const invalida = texto.trim() !== '' && !cargaValida(texto)
                const recorde =
                  editado &&
                  cargaValida(texto) &&
                  a.melhorAnteriorKg !== null &&
                  lerNumero(texto) > a.melhorAnteriorKg
                return (
                  <tr key={id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">
                      <span className="font-medium">{a.aluno.nome}</span>
                      {!turmaId && a.turma && (
                        <span className="block text-xs text-slate-500">{a.turma.nome}</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">
                      {a.prAtual ? (
                        <>
                          {kg(a.prAtual.cargaKg)}
                          <span className="block text-xs text-slate-500">
                            {dataCurta(a.prAtual.dataTeste)}
                          </span>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        ref={(el) => {
                          if (el) entradas.current.set(id, el)
                          else entradas.current.delete(id)
                        }}
                        aria-label={`Carga de ${a.aluno.nome} em ${nomeExercicio}`}
                        aria-invalid={invalida || undefined}
                        inputMode="decimal"
                        enterKeyHint="next"
                        placeholder="—"
                        value={texto}
                        onChange={(e) => setDigitadas((d) => ({ ...d, [id]: e.target.value }))}
                        onKeyDown={(e) => aoTeclar(e, indice)}
                        className={`w-full rounded-lg border px-2 py-1.5 text-right text-base font-bold tabular-nums outline-none focus:ring-2 focus:ring-marca/40 ${
                          invalida
                            ? 'border-red-500'
                            : editado
                              ? 'border-marca-forte'
                              : 'border-slate-300'
                        }`}
                      />
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {invalida ? (
                        <span className="font-semibold text-red-700">Carga inválida</span>
                      ) : recorde ? (
                        <Etiqueta cor="verde">▲ Novo recorde</Etiqueta>
                      ) : editado ? (
                        <span className="text-slate-500">A salvar</span>
                      ) : a.lancamento?.origem === 'TREINADOR' ? (
                        <span className="flex items-center gap-2">
                          <Etiqueta cor="verde">Lançado</Etiqueta>
                          <button
                            type="button"
                            className="font-semibold text-red-700 hover:underline"
                            onClick={() =>
                              confirm(
                                `Excluir a carga de ${a.aluno.nome} (${kg(a.lancamento!.cargaKg)}) em ${formatarData(data)}?`,
                              ) && excluir.mutate(a.lancamento!.id)
                            }
                          >
                            Excluir
                          </button>
                        </span>
                      ) : a.lancamento ? (
                        <Etiqueta>
                          {a.lancamento.origem === 'ALUNO' ? 'Registrado pelo aluno' : 'Importado'}
                        </Etiqueta>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 rounded-b-2xl border-t border-slate-100 bg-white p-4">
        <p className="text-sm text-slate-600">
          {prontas.length ? (
            <>
              <strong>{prontas.length}</strong> carga(s) para salvar
            </>
          ) : (
            'Digite a carga de cada aluno — Enter passa para o próximo'
          )}
          {invalidas.length > 0 && (
            <span className="text-red-700"> · {invalidas.length} inválida(s)</span>
          )}
        </p>
        {(salvar.error || excluir.error) && (
          <div className="w-full">
            <Alerta>{(salvar.error ?? excluir.error)!.message}</Alerta>
          </div>
        )}
        <Botao
          onClick={() =>
            salvar.mutate(
              prontas.map(({ usuarioId, texto }) => ({ usuarioId, cargaKg: lerNumero(texto) })),
            )
          }
          carregando={salvar.isPending}
          disabled={prontas.length === 0 || invalidas.length > 0}
        >
          Salvar {prontas.length > 0 ? `${prontas.length} carga(s)` : 'cargas'}
        </Botao>
      </div>
    </section>
  )
}

function LancamentoPorAluno({
  data,
  exercicioId,
  nomeExercicio,
  aoSalvar,
}: {
  data: string
  exercicioId: string
  nomeExercicio: string
  aoSalvar: (mensagem: string) => void
}) {
  const [busca, setBusca] = useState('')
  const buscaAtrasada = useAtrasado(busca.trim())
  const [escolhido, setEscolhido] = useState<AlunoParaLancar | null>(null)
  const [carga, setCarga] = useState('')
  const entradaCarga = useRef<HTMLInputElement>(null)

  const resultados = useAlunosParaLancar(
    { data, exercicioId, busca: buscaAtrasada },
    buscaAtrasada.length >= 2,
  )
  const salvar = useSalvarLancamentos(data, exercicioId, (m) => {
    setEscolhido(null)
    setCarga('')
    setBusca('')
    aoSalvar(m)
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null
  const encontrados = useMemo(
    () => (buscaAtrasada.length >= 2 ? (resultados.data?.alunos ?? []) : []),
    [buscaAtrasada, resultados.data],
  )

  useEffect(() => {
    if (escolhido) entradaCarga.current?.focus()
  }, [escolhido])

  const valida = cargaValida(carga)
  const recorde =
    escolhido &&
    valida &&
    escolhido.melhorAnteriorKg !== null &&
    lerNumero(carga) > escolhido.melhorAnteriorKg

  return (
    <section
      className="space-y-4 rounded-2xl bg-white p-4 shadow-sm"
      aria-label="Lançamento por aluno"
    >
      {!escolhido ? (
        <>
          <Campo
            rotulo="Aluno"
            type="search"
            placeholder="Digite pelo menos 2 letras do nome ou apelido…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          {buscaAtrasada.length >= 2 &&
            (resultados.isPending ? (
              <Carregando />
            ) : encontrados.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum aluno ativo encontrado.</p>
            ) : (
              <ul
                className="divide-y divide-slate-100 rounded-xl border border-slate-200"
                aria-label="Alunos encontrados"
              >
                {encontrados.map((a) => (
                  <li key={a.aluno.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setEscolhido(a)
                        setCarga(
                          a.lancamento?.origem === 'TREINADOR'
                            ? String(a.lancamento.cargaKg).replace('.', ',')
                            : '',
                        )
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-slate-50"
                    >
                      <span>
                        <span className="block font-medium">{a.aluno.nome}</span>
                        <span className="block text-xs text-slate-500">
                          {a.turma?.nome ?? 'Sem turma'}
                        </span>
                      </span>
                      <span className="text-right text-xs text-slate-500">
                        {a.prAtual ? `PR ${kg(a.prAtual.cargaKg)}` : 'Sem PR'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (valida)
              salvar.mutate([{ usuarioId: escolhido.aluno.id, cargaKg: lerNumero(carga) }])
          }}
          noValidate
        >
          <div className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3">
            <div>
              <p className="font-semibold">{escolhido.aluno.nome}</p>
              <p className="text-sm text-slate-500">
                {escolhido.turma?.nome ?? 'Sem turma'} ·{' '}
                {escolhido.prAtual
                  ? `PR anterior ${kg(escolhido.prAtual.cargaKg)} em ${formatarData(escolhido.prAtual.dataTeste)}`
                  : `sem PR em ${nomeExercicio}`}
              </p>
            </div>
            <Botao variante="link" onClick={() => setEscolhido(null)}>
              Trocar aluno
            </Botao>
          </div>
          <div>
            <label
              htmlFor="carga-aluno"
              className="text-xs font-semibold tracking-wide text-slate-500 uppercase"
            >
              Carga máxima em {nomeExercicio} (kg)
            </label>
            <input
              id="carga-aluno"
              ref={entradaCarga}
              inputMode="decimal"
              value={carga}
              onChange={(e) => setCarga(e.target.value)}
              placeholder="Ex.: 105 ou 92,5"
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-2xl font-extrabold outline-none focus:ring-2 focus:ring-marca/40"
            />
            {carga.trim() !== '' && !valida && (
              <p className="mt-1 text-sm text-red-600">Carga inválida (1 a 500 kg)</p>
            )}
          </div>
          {recorde && (
            <Alerta tipo="sucesso">
              Novo recorde! +{formatarKg(lerNumero(carga) - escolhido.melhorAnteriorKg!)} kg em
              relação ao melhor anterior
            </Alerta>
          )}
          {erro && <Alerta>{erro.message}</Alerta>}
          <Botao type="submit" className="w-full" carregando={salvar.isPending} disabled={!valida}>
            Salvar carga
          </Botao>
        </form>
      )}
    </section>
  )
}
