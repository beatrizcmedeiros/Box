import AsyncStorage from '@react-native-async-storage/async-storage'
import { useQuery } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react'
import { Alerta, Botao, Carregando, Tela } from '../components/ui'
import { api, definirContextoAtual } from './api'
import type { Contexto } from './tipos'

const CHAVE_SALVA = 'prbox.contexto'

type ValorContexto = {
  contexto: Contexto
  contextos: Contexto[]
  trocar: (id: string) => void
}

const ContextoGestao = createContext<ValorContexto | null>(null)

export const useContextos = () =>
  useQuery({ queryKey: ['contextos'], queryFn: () => api<Contexto[]>('/contextos') })

/** Primeira escolha: a última usada; senão, a primeira academia; senão, "Meus alunos". */
const escolherInicial = (contextos: Contexto[], salvo: string | null) =>
  contextos.find((c) => c.id === salvo) ??
  contextos.find((c) => c.tipo === 'academia') ??
  contextos[0]

/** Envolve a área de gestão: define o contexto usado pelas chamadas à API. */
export function ProvedorContexto({ children }: { children: ReactNode }) {
  const contextos = useContextos()
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const [salvoLido, setSalvoLido] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(CHAVE_SALVA)
      .then((salvo) => setEscolhido((atual) => atual ?? salvo))
      .catch(() => undefined)
      .finally(() => setSalvoLido(true))
  }, [])

  if (contextos.isPending || !salvoLido) return <Carregando />
  if (contextos.error) {
    return (
      <Tela>
        <Alerta>{contextos.error.message}</Alerta>
        <Botao aoPressionar={() => contextos.refetch()}>Tentar de novo</Botao>
      </Tela>
    )
  }
  if (contextos.data.length === 0) {
    return (
      <Tela>
        <Alerta tipo="info">Você ainda não trabalha em nenhuma academia.</Alerta>
      </Tela>
    )
  }

  const contexto = escolherInicial(contextos.data, escolhido)
  // Antes de renderizar as telas: as consultas delas já usam este contexto
  definirContextoAtual(contexto.id)

  function trocar(id: string) {
    definirContextoAtual(id)
    setEscolhido(id)
    AsyncStorage.setItem(CHAVE_SALVA, id).catch(() => undefined)
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

/** Id do contexto atual, para entrar nas chaves das consultas (o cache não se mistura). */
export const useIdContexto = () => useContexto().contexto.id
