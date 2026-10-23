import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router'

/**
 * Como o useSearchParams, mas as mudanças se acumulam: duas trocas de filtro seguidas
 * (antes de a URL ser atualizada) não se sobrescrevem. O atualizador do React Router
 * recebe os parâmetros da última renderização, e a segunda mudança apagava a primeira.
 */
export function useParametrosUrl() {
  const [params, setParams] = useSearchParams()
  const ultimos = useRef(params)
  useEffect(() => {
    ultimos.current = params
  }, [params])

  function atualizar(alterar: (atual: URLSearchParams) => URLSearchParams) {
    const novos = alterar(new URLSearchParams(ultimos.current))
    ultimos.current = novos
    setParams(novos, { replace: true })
  }

  return [params, atualizar] as const
}
