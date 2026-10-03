import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { ErroApi } from './lib/api.ts'
import { rotas } from './rotas.tsx'

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      // Erros 4xx (sem permissão, não encontrado) não melhoram com nova tentativa
      retry: (falhas, erro) => !(erro instanceof ErroApi && erro.status < 500) && falhas < 2,
      refetchOnWindowFocus: false,
    },
  },
})

const router = createBrowserRouter(rotas)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={cliente}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
