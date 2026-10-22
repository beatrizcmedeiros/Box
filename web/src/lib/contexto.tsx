import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useState } from 'react'
import { Alerta, Carregando } from '../components/ui.tsx'
import { api, definirContextoAtual } from './api.ts'
import type { Contexto } from './tipos.ts'

const CHAVE_SALVA = 'prbox.contexto'

type ValorContexto = {
  contexto: Contexto
  contextos: Contexto[]
  trocar: (id: string) => void
}

const ContextoGestao = createContext<ValorContexto | null>(null)

export const useContextos = () =>
  useQuery({ queryKey: ['contextos'], queryFn: () => api<Contexto[]>('/contextos') })

const lerSalvo = () => {
  try {
    return localStorage.getItem(CHAVE_SALVA)
  } catch {
    return null
  }
}

/** Primeira escolha: a última usada; senão, a primeira academia; senão, "Meus alunos". */
function escolherInicial(contextos: Contexto[]) {
  const salvo = lerSalvo()
  return (
    contextos.find((c) => c.id === salvo) ??
    contextos.find((c) => c.tipo === 'academia') ??
    contextos[0]
  )
}

/** Envolve a área de gestão: define o contexto usado pelas chamadas à API. */
export function ProvedorContexto({ children }: { children: ReactNode }) {
  const contextos = useContextos()
  const cliente = useQueryClient()
  const [escolhido, setEscolhido] = useState<string | null>(null)

  if (contextos.isPending) return <Carregando />
  if (contextos.error) {
    return (
      <div className="p-4">
        <Alerta>{contextos.error.message}</Alerta>
      </div>
    )
  }
  if (contextos.data.length === 0) {
    return (
      <div className="p-4">
        <Alerta tipo="info">Você ainda não trabalha em nenhuma academia.</Alerta>
      </div>
    )
  }

  const contexto = contextos.data.find((c) => c.id === escolhido) ?? escolherInicial(contextos.data)
  // Antes de renderizar as telas: as consultas delas já usam este contexto
  definirContextoAtual(contexto.id)

  function trocar(id: string) {
    if (id === contexto.id) return
    try {
      localStorage.setItem(CHAVE_SALVA, id)
    } catch {
      // sem armazenamento: a escolha vale só nesta aba
    }
    definirContextoAtual(id)
    setEscolhido(id)
    // Nunca mostrar dados de um contexto no outro
    cliente.removeQueries({
      predicate: (q) =>
        !['usuario', 'contextos', 'prs', 'vinculos'].includes(String(q.queryKey[0])),
    })
  }

  return (
    <ContextoGestao.Provider value={{ contexto, contextos: contextos.data, trocar }}>
      {children}
    </ContextoGestao.Provider>
  )
}

export function useContexto() {
  const valor = useContext(ContextoGestao)
  if (!valor) throw new Error('useContexto precisa estar dentro de ProvedorContexto')
  return valor
}
