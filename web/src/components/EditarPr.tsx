import { useMutation } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { api, ErroApi } from '../lib/api.ts'
import { formatarKg, hojeIso, lerNumero } from '../lib/formato.ts'
import type { Lancamento } from '../lib/tipos.ts'
import { Alerta, Botao, Campo, Modal } from './ui.tsx'

/**
 * Corrige a data ou a carga de um PR. `caminho` é a rota de edição: a do aluno
 * (/me/prs/lancamentos/:id) ou a da gestão (/c/:contexto/alunos/:id/prs/:prId).
 */
export function EditarPr({
  titulo,
  pr,
  caminho,
  aoFechar,
  aoSalvar,
}: {
  titulo: string
  pr: Lancamento
  caminho: string
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [dataTeste, setDataTeste] = useState(pr.dataTeste)
  const [carga, setCarga] = useState(formatarKg(pr.cargaKg))

  const salvar = useMutation({
    mutationFn: () => {
      const cargaKg = lerNumero(carga)
      return api<Lancamento>(caminho, {
        method: 'PUT',
        body: { dataTeste, cargaKg: Number.isNaN(cargaKg) ? carga : cargaKg },
      })
    },
    onSuccess: aoSalvar,
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }

  return (
    <Modal titulo={titulo} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
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
          value={carga}
          onChange={(e) => setCarga(e.target.value)}
          erro={erro?.doCampo('cargaKg')}
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
