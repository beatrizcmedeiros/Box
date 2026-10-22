import { useMutation, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Alerta, Botao, Campo, Selecao } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import { useExerciciosAtivos, usePrs } from '../../lib/consultasAluno.ts'
import { useOnline } from '../../lib/pwaHooks.ts'
import { formatarKg, hojeIso, lerNumero } from '../../lib/formato.ts'
import type { Lancamento } from '../../lib/tipos.ts'
import { CabecalhoAluno } from './LayoutAluno.tsx'

/** Cadastro do resultado de um teste de carga (Figura 1c). */
export function RegistrarPr() {
  const [params] = useSearchParams()
  const navegar = useNavegarAposSalvar()
  const exercicios = useExerciciosAtivos()
  const prs = usePrs()

  const [exercicioId, setExercicioId] = useState(params.get('exercicio') ?? '')
  const [dataTeste, setDataTeste] = useState(hojeIso())
  const [carga, setCarga] = useState('')

  const online = useOnline()
  const cargaKg = lerNumero(carga)
  const prAtual = prs.data?.find((r) => r.exercicio.id === Number(exercicioId))?.pr.cargaKg
  const novoRecorde = prAtual !== undefined && cargaKg > prAtual

  const salvar = useMutation({
    mutationFn: () =>
      api<Lancamento>('/me/prs', {
        method: 'POST',
        body: {
          exercicioId: Number(exercicioId),
          dataTeste,
          cargaKg: Number.isNaN(cargaKg) ? carga : cargaKg,
        },
      }),
    onSuccess: () => navegar(Number(exercicioId)),
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }

  return (
    <>
      <CabecalhoAluno
        titulo="Registrar PR"
        subtitulo="Informe o resultado do teste de carga"
        voltarPara="/aluno/prs"
      />
      <form
        onSubmit={enviar}
        className="m-4 space-y-4 rounded-2xl bg-white p-4 shadow-sm"
        noValidate
      >
        <Selecao
          rotulo="Exercício"
          value={exercicioId}
          onChange={(e) => setExercicioId(e.target.value)}
          erro={erro?.doCampo('exercicioId')}
        >
          <option value="" disabled>
            {exercicios.isPending ? 'Carregando…' : 'Escolha o exercício'}
          </option>
          {exercicios.data?.map((e) => (
            <option key={e.id} value={e.id}>
              {e.origem ? `${e.nome} · ${e.origem}` : e.nome}
            </option>
          ))}
        </Selecao>
        <NovoExercicioPessoal aoCriar={(id) => setExercicioId(String(id))} />
        {exercicios.data?.length === 0 && (
          <Alerta tipo="info">
            Nenhum exercício disponível ainda. Peça ao seu treinador para cadastrar os exercícios do
            box.
          </Alerta>
        )}
        <Campo
          rotulo="Data do teste de carga"
          type="date"
          value={dataTeste}
          max={hojeIso()}
          onChange={(e) => setDataTeste(e.target.value)}
          erro={erro?.doCampo('dataTeste')}
        />
        <Campo
          rotulo="Carga máxima (PR) em kg"
          inputMode="decimal"
          placeholder="Ex.: 105 ou 92,5"
          value={carga}
          onChange={(e) => setCarga(e.target.value)}
          erro={erro?.doCampo('cargaKg')}
          className="[&_input]:text-2xl [&_input]:font-extrabold"
        />

        {novoRecorde && (
          <Alerta tipo="sucesso">
            Novo recorde! +{formatarKg(cargaKg - prAtual)} kg em relação ao PR atual (
            {formatarKg(prAtual)} kg)
          </Alerta>
        )}
        {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
        {!online && (
          <Alerta tipo="info">Sem internet: o PR poderá ser salvo quando a conexão voltar.</Alerta>
        )}

        <Botao
          type="submit"
          className="w-full"
          carregando={salvar.isPending}
          disabled={!exercicioId || !online}
        >
          Salvar PR
        </Botao>
        <Link to="/aluno/prs" className="block text-center text-sm font-semibold text-slate-600">
          Cancelar
        </Link>
      </form>
    </>
  )
}

/** Atualiza os dados em cache e leva ao detalhe do exercício salvo. */
function useNavegarAposSalvar() {
  const cliente = useQueryClient()
  const navegar = useNavigate()
  return (exercicioId: number) => {
    cliente.invalidateQueries({ queryKey: ['prs'] })
    navegar(`/aluno/exercicios/${exercicioId}`, { replace: true, state: { salvo: true } })
  }
}

/** Exercício que não está na lista: o aluno cria um pessoal (só ele usa). */
function NovoExercicioPessoal({ aoCriar }: { aoCriar: (id: number) => void }) {
  const cliente = useQueryClient()
  const [aberto, setAberto] = useState(false)
  const [nome, setNome] = useState('')
  const criar = useMutation({
    mutationFn: () => api<{ id: number }>('/me/exercicios', { method: 'POST', body: { nome } }),
    onSuccess: async ({ id }) => {
      await cliente.invalidateQueries({ queryKey: ['exercicios-ativos'] })
      aoCriar(id)
      setNome('')
      setAberto(false)
    },
  })

  if (!aberto) {
    return (
      <Botao variante="link" onClick={() => setAberto(true)}>
        + Exercício que não está na lista
      </Botao>
    )
  }
  return (
    <div className="space-y-2 rounded-xl bg-slate-50 p-3">
      <Campo
        rotulo="Nome do exercício pessoal"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        dica="Só você usa este exercício."
      />
      {criar.error && <Alerta>{criar.error.message}</Alerta>}
      <div className="flex justify-end gap-3">
        <Botao variante="secundario" onClick={() => setAberto(false)}>
          Cancelar
        </Botao>
        <Botao carregando={criar.isPending} disabled={!nome.trim()} onClick={() => criar.mutate()}>
          Criar
        </Botao>
      </div>
    </div>
  )
}
