import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Com vários arquivos rodando em paralelo, 1 s (padrão) é pouco para telas com redirecionamento
configure({ asyncUtilTimeout: 3000 })

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
