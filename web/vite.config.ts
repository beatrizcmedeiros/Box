import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import { CACHE_DADOS_ALUNO } from './src/lib/pwaConstantes.ts'

const proxyApi = { '/api': 'http://localhost:3333' }

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // A atualização só é aplicada quando o usuário aceita (aviso "Nova versão disponível")
      registerType: 'prompt',
      injectRegister: false,
      // Os ícones já entram pelo globPatterns abaixo
      includeManifestIcons: false,
      manifest: {
        name: 'PR Box — cargas de treino',
        short_name: 'PR Box',
        description:
          'Seus recordes (PRs) e as cargas de 35% a 55% sempre à mão, mesmo sem internet no box.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#141c28',
        background_color: '#141c28',
        categories: ['health', 'fitness', 'sports'],
        icons: [
          { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icones/icone-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Leitura de PDF/OCR é do treinador e pesada (~1,7 MB): não entra no pacote offline
        globIgnores: ['**/pdf.worker*', '**/extrairTextoPdf*'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Dados do aluno: tenta a rede; sem sinal (ou rede lenta), usa a última cópia salva
            urlPattern: ({ url, sameOrigin }) =>
              sameOrigin && /^\/api\/(auth\/me$|me\/)/.test(url.pathname),
            method: 'GET',
            handler: 'NetworkFirst',
            options: {
              cacheName: CACHE_DADOS_ALUNO,
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [200] },
              plugins: [
                {
                  // Marca a resposta vinda do cache para o app avisar "mostrando dados salvos"
                  cachedResponseWillBeUsed: async ({ cachedResponse }) => {
                    if (!cachedResponse) return cachedResponse
                    const headers = new Headers(cachedResponse.headers)
                    headers.set('x-prbox-offline', '1')
                    return new Response(await cachedResponse.blob(), {
                      status: cachedResponse.status,
                      statusText: cachedResponse.statusText,
                      headers,
                    })
                  },
                },
              ],
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Em desenvolvimento, /api é encaminhado para a API local
    proxy: proxyApi,
  },
  // "npm run preview -w web": testa o build com service worker, também usando a API local
  preview: {
    port: 4173,
    proxy: proxyApi,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    alias: {
      // O módulo virtual do PWA só existe no build do Vite; nos testes usa uma versão simulada
      'virtual:pwa-register/react': fileURLToPath(
        new URL('./src/test/pwaRegisterFalso.ts', import.meta.url),
      ),
    },
  },
})
