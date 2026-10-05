import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Alerta, Botao, Campo, Selecao } from '../../../components/ui.tsx'
import { api, ErroApi } from '../../../lib/api.ts'
import { useTurmas } from '../../../lib/consultas.ts'
import { hojeIso } from '../../../lib/formato.ts'
import type { Previa } from '../../../lib/tipos.ts'
import { CabecalhoPagina } from '../LayoutTreinador.tsx'
import { HistoricoImportacoes } from './HistoricoImportacoes.tsx'
import { RevisaoImportacao } from './RevisaoImportacao.tsx'

type Origem = 'pdf' | 'texto'

export type DadosImportacao = {
  dataTeste: string
  turmaId: number | null
  nomeArquivo: string
  texto: string
}

/** Importação do teste de força a partir da lista do treinador (Figura 3). */
export function ImportarCargas() {
  const cliente = useQueryClient()
  const [dados, setDados] = useState<DadosImportacao | null>(null)
  const [previa, setPrevia] = useState<Previa | null>(null)
  const [concluido, setConcluido] = useState<string | null>(null)

  return (
    <>
      <CabecalhoPagina
        titulo="Importar teste de carga máxima"
        subtitulo='Envie o PDF da lista do teste de força (uma linha por aluno, como "Ana 55kg") ou cole o texto'
      />

      {concluido && (
        <div className="mb-4">
          <Alerta tipo="sucesso">{concluido}</Alerta>
        </div>
      )}

      {previa && dados ? (
        <RevisaoImportacao
          previa={previa}
          dados={dados}
          aoVoltar={() => setPrevia(null)}
          aoConcluir={(mensagem) => {
            setConcluido(mensagem)
            setPrevia(null)
            setDados(null)
            cliente.invalidateQueries({ queryKey: ['importacoes'] })
            cliente.invalidateQueries({ queryKey: ['alunos'] })
            cliente.invalidateQueries({ queryKey: ['exercicios'] })
          }}
        />
      ) : (
        <FormularioOrigem
          inicial={dados}
          aoLer={(novosDados, novaPrevia) => {
            setConcluido(null)
            setDados(novosDados)
            setPrevia(novaPrevia)
          }}
        />
      )}

      <HistoricoImportacoes />
    </>
  )
}

function FormularioOrigem({
  inicial,
  aoLer,
}: {
  inicial: DadosImportacao | null
  aoLer: (dados: DadosImportacao, previa: Previa) => void
}) {
  const turmas = useTurmas()
  const [dataTeste, setDataTeste] = useState(inicial?.dataTeste ?? hojeIso())
  const [turmaId, setTurmaId] = useState<number | null>(inicial?.turmaId ?? null)
  // Ao voltar da revisão, o texto lido fica disponível para correção manual
  const [origem, setOrigem] = useState<Origem>(inicial ? 'texto' : 'pdf')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [texto, setTexto] = useState(inicial?.texto ?? '')
  const [progresso, setProgresso] = useState<string | null>(null)
  const nomeArquivo =
    origem === 'pdf' ? (arquivo?.name ?? '') : (inicial?.nomeArquivo ?? 'Texto colado')

  const ler = useMutation({
    mutationFn: async () => {
      let conteudo = texto
      if (origem === 'pdf') {
        if (!arquivo) throw new Error('Escolha o arquivo PDF')
        const { extrairTextoPdf } = await import('../../../lib/extrairTextoPdf.ts')
        const extraido = await extrairTextoPdf(arquivo, (p) =>
          setProgresso(`${p.etapa} ${p.percentual}%`),
        )
        conteudo = extraido.texto
        setTexto(conteudo)
      }
      setProgresso('Conferindo os nomes com os alunos cadastrados…')
      const previa = await api<Previa>('/admin/importacoes/previa', {
        method: 'POST',
        body: { texto: conteudo, turmaId },
      })
      return { dados: { dataTeste, turmaId, nomeArquivo, texto: conteudo }, previa }
    },
    onSuccess: ({ dados, previa }) => aoLer(dados, previa),
    onSettled: () => setProgresso(null),
  })
  const erro = ler.error instanceof ErroApi ? ler.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    ler.mutate()
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl bg-white p-5 shadow-sm" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo
          rotulo="Data do teste de carga"
          type="date"
          value={dataTeste}
          max={hojeIso()}
          onChange={(e) => setDataTeste(e.target.value)}
          required
        />
        <Selecao
          rotulo="Turma (opcional)"
          value={turmaId ?? ''}
          onChange={(e) => setTurmaId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">Todas as turmas</option>
          {turmas.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </Selecao>
      </div>
      <p className="-mt-2 text-xs text-slate-500">
        A turma ajuda a desempatar nomes repetidos (ex.: duas “Ana”).
      </p>

      <div role="tablist" aria-label="Origem da lista" className="flex gap-2">
        {(['pdf', 'texto'] as const).map((o) => (
          <button
            key={o}
            type="button"
            role="tab"
            aria-selected={origem === o}
            onClick={() => setOrigem(o)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              origem === o ? 'bg-fundo-escuro text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            {o === 'pdf' ? 'Arquivo PDF' : 'Colar texto'}
          </button>
        ))}
      </div>

      {origem === 'pdf' ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-orange-300 bg-orange-50/50 p-6 text-center">
          <span className="font-semibold">{arquivo ? arquivo.name : 'Escolher arquivo PDF'}</span>
          <span className="text-sm text-slate-500">
            {arquivo
              ? `${(arquivo.size / 1024).toFixed(0)} KB · o arquivo é lido neste aparelho e não é enviado ao servidor`
              : 'PDF com texto ou imagem (ex.: nota do celular exportada em PDF)'}
          </span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            className="sr-only"
            aria-label="Arquivo PDF"
            onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          />
        </label>
      ) : (
        <div>
          <label
            htmlFor="texto-lista"
            className="text-xs font-semibold tracking-wide text-slate-500 uppercase"
          >
            Texto da lista
          </label>
          <textarea
            id="texto-lista"
            rows={10}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={'Teste agachamento\nAna 55kg\nBruno 80 kg\n…'}
            className="mt-1.5 w-full rounded-xl border border-slate-300 p-3 font-mono text-sm outline-none focus:ring-2 focus:ring-marca/40"
          />
        </div>
      )}

      {progresso && <Alerta tipo="info">{progresso}</Alerta>}
      {ler.error && <Alerta>{erro?.doCampo('texto') ?? ler.error.message}</Alerta>}

      <div className="flex justify-end">
        <Botao
          type="submit"
          carregando={ler.isPending}
          disabled={!dataTeste || (origem === 'pdf' ? !arquivo : !texto.trim())}
        >
          Ler resultados
        </Botao>
      </div>
    </form>
  )
}
