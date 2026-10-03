import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { type FormEvent, useState } from 'react'
import { Alerta, Botao, Campo, Carregando, Etiqueta, Modal, Selecao } from '../../components/ui.tsx'
import { api, ErroApi } from '../../lib/api.ts'
import { CATEGORIAS, type CategoriaExercicio, type Exercicio } from '../../lib/tipos.ts'
import { CabecalhoPagina } from './LayoutTreinador.tsx'

export function Exercicios() {
  const cliente = useQueryClient()
  const exercicios = useQuery({
    queryKey: ['exercicios'],
    queryFn: () => api<Exercicio[]>('/admin/exercicios'),
  })
  const [editando, setEditando] = useState<Exercicio | 'novo' | null>(null)

  const atualizar = () => cliente.invalidateQueries({ queryKey: ['exercicios'] })

  const excluir = useMutation({
    mutationFn: (exercicio: Exercicio) =>
      api<void>(`/admin/exercicios/${exercicio.id}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  return (
    <>
      <CabecalhoPagina
        titulo="Exercícios"
        subtitulo="Exercícios avaliados no teste de força e seus nomes alternativos no PDF"
        acao={<Botao onClick={() => setEditando('novo')}>+ Novo exercício</Botao>}
      />
      {excluir.error && (
        <div className="mb-4">
          <Alerta>{excluir.error.message}</Alerta>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm">
        {exercicios.isPending ? (
          <Carregando />
        ) : exercicios.error ? (
          <div className="p-4">
            <Alerta>{exercicios.error.message}</Alerta>
          </div>
        ) : exercicios.data.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Nenhum exercício cadastrado.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {exercicios.data.map((exercicio) => (
              <li
                key={exercicio.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    {exercicio.nome}
                    <Etiqueta>{CATEGORIAS[exercicio.categoria]}</Etiqueta>
                    {!exercicio.ativo && <Etiqueta cor="amarelo">Inativo</Etiqueta>}
                  </p>
                  {exercicio.aliases.length > 0 && (
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      Também lido como: {exercicio.aliases.join(', ')}
                    </p>
                  )}
                </div>
                <div className="space-x-3">
                  <Botao variante="link" onClick={() => setEditando(exercicio)}>
                    Editar
                  </Botao>
                  <Botao
                    variante="link"
                    className="!text-red-600"
                    onClick={() =>
                      confirm(`Excluir ${exercicio.nome}?`) && excluir.mutate(exercicio)
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
        <FormularioExercicio
          exercicio={editando === 'novo' ? null : editando}
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

function FormularioExercicio({
  exercicio,
  aoFechar,
  aoSalvar,
}: {
  exercicio: Exercicio | null
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [nome, setNome] = useState(exercicio?.nome ?? '')
  const [categoria, setCategoria] = useState<CategoriaExercicio>(
    exercicio?.categoria ?? 'LEVANTAMENTO',
  )
  const [ativo, setAtivo] = useState(exercicio?.ativo ?? true)
  const [aliases, setAliases] = useState(exercicio?.aliases.join(', ') ?? '')

  const salvar = useMutation({
    mutationFn: () => {
      const body = {
        nome,
        categoria,
        ativo,
        aliases: aliases
          .split(',')
          .map((a) => a.trim())
          .filter(Boolean),
      }
      return exercicio
        ? api<Exercicio>(`/admin/exercicios/${exercicio.id}`, { method: 'PUT', body })
        : api<Exercicio>('/admin/exercicios', { method: 'POST', body })
    },
    onSuccess: aoSalvar,
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  function enviar(e: FormEvent) {
    e.preventDefault()
    salvar.mutate()
  }

  return (
    <Modal titulo={exercicio ? 'Editar exercício' : 'Novo exercício'} aoFechar={aoFechar}>
      <form onSubmit={enviar} className="space-y-4" noValidate>
        <Campo
          rotulo="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          erro={erro?.doCampo('nome')}
          placeholder="Ex.: Back Squat"
          autoFocus
        />
        <Selecao
          rotulo="Categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as CategoriaExercicio)}
        >
          {Object.entries(CATEGORIAS).map(([valor, rotulo]) => (
            <option key={valor} value={valor}>
              {rotulo}
            </option>
          ))}
        </Selecao>
        <Campo
          rotulo="Nomes alternativos"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
          dica="Separe por vírgula. Ex.: agachamento livre, back sq — usados para reconhecer o exercício no PDF."
        />
        {exercicio && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-marca"
              checked={ativo}
              onChange={(e) => setAtivo(e.target.checked)}
            />
            Exercício ativo
          </label>
        )}
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
