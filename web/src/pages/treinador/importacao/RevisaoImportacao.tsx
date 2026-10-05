import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Alerta, Botao, Etiqueta } from '../../../components/ui.tsx'
import { api } from '../../../lib/api.ts'
import { formatarData } from '../../../lib/formato.ts'
import type { Previa } from '../../../lib/tipos.ts'
import {
  type LinhaEditavel,
  linhasDuplicadas,
  montarEnvio,
  montarEstado,
  pendenciaDaLinha,
  type SecaoEditavel,
  type SituacaoLinha,
} from './estado.ts'
import type { DadosImportacao } from './ImportarCargas.tsx'

const etiquetas: Record<SituacaoLinha, { cor: 'verde' | 'amarelo' | 'cinza'; texto: string }> = {
  encontrado: { cor: 'verde', texto: 'Aluno encontrado' },
  sugestao: { cor: 'amarelo', texto: 'Confirme o aluno' },
  nao_encontrado: { cor: 'amarelo', texto: 'Não encontrado' },
  problema: { cor: 'amarelo', texto: 'Revisar linha' },
}

type Resposta = { criados: number; atualizados: number; apelidosSalvos: number }

export function RevisaoImportacao({
  previa,
  dados,
  aoVoltar,
  aoConcluir,
}: {
  previa: Previa
  dados: DadosImportacao
  aoVoltar: () => void
  aoConcluir: (mensagem: string) => void
}) {
  const inicial = useMemo(() => montarEstado(previa), [previa])
  const [secoes, setSecoes] = useState<SecaoEditavel[]>(inicial.secoes)
  const [linhas, setLinhas] = useState<LinhaEditavel[]>(inicial.linhas)
  const [lembrarApelidos, setLembrarApelidos] = useState(true)

  const duplicadas = linhasDuplicadas(linhas, secoes)
  const prontas = linhas.filter((l) => l.incluir && !pendenciaDaLinha(l, secoes[l.secao]))
  const pendentes = linhas.length - prontas.length

  const alterarLinha = (chave: string, mudanca: Partial<LinhaEditavel>) =>
    setLinhas((atual) => atual.map((l) => (l.chave === chave ? { ...l, ...mudanca } : l)))
  const alterarSecao = (indice: number, mudanca: Partial<SecaoEditavel>) =>
    setSecoes((atual) => atual.map((s, i) => (i === indice ? { ...s, ...mudanca } : s)))

  const confirmar = useMutation({
    mutationFn: () =>
      api<Resposta>('/admin/importacoes', {
        method: 'POST',
        body: {
          dataTeste: dados.dataTeste,
          turmaId: dados.turmaId,
          nomeArquivo: dados.nomeArquivo || 'Texto colado',
          ...montarEnvio(linhas, secoes, lembrarApelidos),
        },
      }),
    onSuccess: (r) => {
      const partes = [
        `${r.criados + r.atualizados} resultado(s) importado(s) para ${formatarData(dados.dataTeste)}`,
      ]
      if (r.atualizados) partes.push(`${r.atualizados} já existia(m) e foi(ram) atualizado(s)`)
      if (r.apelidosSalvos)
        partes.push(`${r.apelidosSalvos} apelido(s) memorizado(s) para as próximas importações`)
      aoConcluir(`${partes.join('. ')}.`)
    },
  })

  return (
    <section className="space-y-4" aria-label="Revisão da importação">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <div>
          <p className="font-semibold">{dados.nomeArquivo || 'Texto colado'}</p>
          <p className="text-sm text-slate-500">
            Teste de {formatarData(dados.dataTeste)} · {previa.resumo.linhas} linha(s) lida(s) ·{' '}
            {previa.resumo.encontrados} reconhecida(s) automaticamente
          </p>
        </div>
        <Botao variante="secundario" onClick={aoVoltar}>
          Ver / corrigir o texto lido
        </Botao>
      </div>

      {secoes.map((secao, indice) => (
        <div key={indice} className="overflow-x-auto rounded-2xl bg-white p-4 shadow-sm">
          <SeletorExercicio
            secao={secao}
            exercicios={previa.exercicios}
            aoAlterar={(m) => alterarSecao(indice, m)}
          />
          <table className="mt-3 w-full min-w-[720px] text-left text-sm">
            <thead className="border-b-2 border-slate-100 text-xs tracking-wide text-slate-500 uppercase">
              <tr>
                <th className="w-10 px-2 py-2">
                  <span className="sr-only">Incluir</span>
                </th>
                <th className="px-2 py-2">Lido na lista</th>
                <th className="px-2 py-2">Aluno</th>
                <th className="w-28 px-2 py-2">Carga (kg)</th>
                <th className="px-2 py-2">Situação</th>
              </tr>
            </thead>
            <tbody>
              {linhas
                .filter((l) => l.secao === indice)
                .map((linha) => (
                  <LinhaRevisao
                    key={linha.chave}
                    linha={linha}
                    secao={secao}
                    alunos={previa.alunos}
                    duplicada={duplicadas.has(linha.chave)}
                    aoAlterar={(m) => alterarLinha(linha.chave, m)}
                  />
                ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="sticky bottom-0 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-marca"
            checked={lembrarApelidos}
            onChange={(e) => setLembrarApelidos(e.target.checked)}
          />
          Memorizar os nomes da lista que eu associei manualmente (ex.: “Lurdinha”) para as próximas
          importações
        </label>
        {duplicadas.size > 0 && (
          <Alerta>
            Há alunos repetidos no mesmo exercício. Desmarque ou corrija as linhas destacadas.
          </Alerta>
        )}
        {confirmar.error && <Alerta>{confirmar.error.message}</Alerta>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <strong>{prontas.length}</strong> resultado(s) pronto(s) para importar
            {pendentes > 0 && ` · ${pendentes} linha(s) fora da importação`}
          </p>
          <div className="flex gap-3">
            <Botao variante="secundario" onClick={aoVoltar}>
              Cancelar
            </Botao>
            <Botao
              onClick={() => confirmar.mutate()}
              carregando={confirmar.isPending}
              disabled={prontas.length === 0 || duplicadas.size > 0}
            >
              Confirmar importação ({prontas.length})
            </Botao>
          </div>
        </div>
      </div>
    </section>
  )
}

function SeletorExercicio({
  secao,
  exercicios,
  aoAlterar,
}: {
  secao: SecaoEditavel
  exercicios: Previa['exercicios']
  aoAlterar: (m: Partial<SecaoEditavel>) => void
}) {
  // Exercícios sugeridos pelo título aparecem primeiro
  const ordenados = [
    ...exercicios.filter((e) => secao.candidatos.includes(e.id)),
    ...exercicios.filter((e) => !secao.candidatos.includes(e.id)),
  ]
  const nomeEscolhido = exercicios.find((e) => e.id === secao.exercicioId)?.nome

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
      <div>
        <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Título na lista
        </p>
        <p className="font-semibold">{secao.titulo ?? '(sem título)'}</p>
      </div>
      <label className="min-w-56">
        <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
          Exercício
        </span>
        <select
          aria-label="Exercício"
          className={`mt-1 w-full rounded-xl border bg-white px-3 py-2 ${secao.exercicioId ? 'border-slate-300' : 'border-amber-400'}`}
          value={secao.exercicioId ?? ''}
          onChange={(e) =>
            aoAlterar({ exercicioId: e.target.value ? Number(e.target.value) : null })
          }
        >
          <option value="">
            {secao.candidatos.length > 1
              ? 'Qual exercício? (título ambíguo)'
              : 'Escolha o exercício'}
          </option>
          {ordenados.map((e) => (
            <option key={e.id} value={e.id}>
              {e.nome}
              {secao.candidatos.includes(e.id) ? ' — sugerido' : ''}
            </option>
          ))}
        </select>
      </label>
      {!secao.reconhecido && secao.tituloLimpo && secao.exercicioId && (
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-marca"
            checked={secao.lembrarTitulo}
            onChange={(e) => aoAlterar({ lembrarTitulo: e.target.checked })}
          />
          Reconhecer “{secao.tituloLimpo}” como {nomeEscolhido} nas próximas vezes
        </label>
      )}
    </div>
  )
}

function LinhaRevisao({
  linha,
  secao,
  alunos,
  duplicada,
  aoAlterar,
}: {
  linha: LinhaEditavel
  secao: SecaoEditavel
  alunos: Previa['alunos']
  duplicada: boolean
  aoAlterar: (m: Partial<LinhaEditavel>) => void
}) {
  const pendencia = pendenciaDaLinha(linha, secao)
  const ordenados = [
    ...alunos.filter((a) => linha.candidatos.includes(a.id)),
    ...alunos.filter((a) => !linha.candidatos.includes(a.id)),
  ]
  const etiqueta = etiquetas[linha.situacao]
  const confirmado = linha.escolhaManual && linha.incluir

  return (
    <tr
      className={`border-b border-slate-100 last:border-0 ${duplicada ? 'bg-red-50' : linha.incluir ? '' : 'bg-slate-50 text-slate-500'}`}
    >
      <td className="px-2 py-2">
        <input
          type="checkbox"
          className="size-4 accent-marca"
          aria-label={`Incluir ${linha.nomeLido}`}
          checked={linha.incluir}
          disabled={!!pendencia && !linha.incluir}
          onChange={(e) =>
            aoAlterar({
              incluir: e.target.checked,
              escolhaManual: linha.escolhaManual || linha.situacao !== 'encontrado',
            })
          }
        />
      </td>
      <td className="px-2 py-2">
        <span className="font-medium text-slate-800">{linha.nomeLido}</span>
        <span className="block text-xs text-slate-400">
          linha {linha.numero}: “{linha.texto}”
        </span>
      </td>
      <td className="px-2 py-2">
        <select
          aria-label={`Aluno da linha ${linha.numero}`}
          className={`w-full rounded-lg border bg-white px-2 py-1.5 ${linha.alunoId ? 'border-slate-300' : 'border-amber-400'}`}
          value={linha.alunoId ?? ''}
          onChange={(e) => {
            const alunoId = e.target.value ? Number(e.target.value) : null
            aoAlterar({ alunoId, escolhaManual: true, incluir: !!alunoId })
          }}
        >
          <option value="">Escolha o aluno…</option>
          {ordenados.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nome}
              {a.turma ? ` (${a.turma})` : ''}
              {linha.candidatos.includes(a.id) ? ' — sugerido' : ''}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2">
        <input
          aria-label={`Carga da linha ${linha.numero}`}
          inputMode="decimal"
          className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-right font-bold tabular-nums"
          value={linha.carga}
          onChange={(e) => aoAlterar({ carga: e.target.value })}
        />
      </td>
      <td className="px-2 py-2">
        {duplicada ? (
          <Etiqueta cor="amarelo">Aluno repetido</Etiqueta>
        ) : confirmado ? (
          <Etiqueta cor="verde">Confirmado</Etiqueta>
        ) : (
          <Etiqueta cor={etiqueta.cor}>{etiqueta.texto}</Etiqueta>
        )}
        {(pendencia ?? linha.detalhe) && !confirmado && (
          <span className="mt-0.5 block text-xs text-slate-500">{pendencia ?? linha.detalhe}</span>
        )}
      </td>
    </tr>
  )
}
