import NetInfo from '@react-native-community/netinfo'
import {
  focusManager,
  onlineManager,
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from '@tanstack/react-query'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { AppState, Platform } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Alerta, Botao, TelaPublica } from '../components/ui'
import { definirAoPerderSessao, ErroApi } from '../lib/api'
import { CHAVE_USUARIO, useUsuario } from '../lib/sessao'
import { cores } from '../lib/tema'

SplashScreen.preventAutoHideAsync()

// Ao voltar para o app, as telas abertas buscam os dados de novo: o que o aluno ou o
// treinador mudou em outro aparelho aparece aqui sem precisar sair e entrar na tela
focusManager.setEventListener((aoMudarFoco) => {
  const assinatura = AppState.addEventListener('change', (estado) => {
    if (Platform.OS !== 'web') aoMudarFoco(estado === 'active')
  })
  return () => assinatura.remove()
})

// Sem sinal, as consultas esperam; quando a conexão volta, buscam de novo
onlineManager.setEventListener((definirOnline) =>
  NetInfo.addEventListener((estado) => definirOnline(!!estado.isConnected)),
)

const cliente = new QueryClient({
  defaultOptions: {
    queries: {
      // Erros 4xx (sem permissão, não encontrado) não melhoram com nova tentativa
      retry: (falhas, erro) => !(erro instanceof ErroApi && erro.status < 500) && falhas < 2,
      staleTime: 15_000,
    },
  },
})

export default function LayoutRaiz() {
  return (
    <QueryClientProvider client={cliente}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Navegacao />
      </SafeAreaProvider>
    </QueryClientProvider>
  )
}

function Navegacao() {
  const usuario = useUsuario()
  const queryClient = useQueryClient()

  useEffect(() => {
    // Refresh token recusado (expirou ou foi revogado em outro aparelho): volta para o login
    definirAoPerderSessao(() => {
      queryClient.setQueryData(CHAVE_USUARIO, null)
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== CHAVE_USUARIO[0] })
    })
  }, [queryClient])

  useEffect(() => {
    if (!usuario.isPending) SplashScreen.hideAsync()
  }, [usuario.isPending])

  if (usuario.isPending) return null

  if (usuario.error) {
    return (
      <TelaPublica subtitulo="Não foi possível abrir sua sessão">
        <Alerta>{usuario.error.message}</Alerta>
        <Botao aoPressionar={() => usuario.refetch()} carregando={usuario.isFetching}>
          Tentar de novo
        </Botao>
      </TelaPublica>
    )
  }

  const u = usuario.data
  const pronto = !!u && !u.trocarSenha && !u.consentimentoPendente

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.fundoEscuro },
        headerTintColor: cores.branco,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Protected guard={!u}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!u && u.trocarSenha}>
        <Stack.Screen name="primeiro-acesso/senha" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!!u && !u.trocarSenha && u.consentimentoPendente}>
        <Stack.Screen name="primeiro-acesso/termo" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={pronto && u.perfil === 'ALUNO'}>
        <Stack.Screen name="(aluno)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={pronto && u.perfil === 'TREINADOR'}>
        <Stack.Screen name="treinador" options={{ title: 'PR Box — Treinador' }} />
      </Stack.Protected>
    </Stack>
  )
}
