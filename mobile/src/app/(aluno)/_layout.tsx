import { Redirect, Stack } from 'expo-router'
import { fazGestao, useUsuario } from '../../lib/sessao'
import { cores } from '../../lib/tema'

// O app sempre abre em "/" (área do aluno). O professor deve começar na área dele: na primeira
// vez que cada conta chega aqui, ela é levada para a gestão. Depois, a aba "Meus PRs" da
// gestão volta para cá normalmente.
let jaLevouParaGestao: number | null = null

/** Abas do aluno + telas que abrem por cima delas (registrar PR e detalhe do exercício). */
export default function LayoutAluno() {
  const { data: usuario } = useUsuario()
  if (usuario && fazGestao(usuario) && jaLevouParaGestao !== usuario.id) {
    jaLevouParaGestao = usuario.id
    return <Redirect href="/treinador" />
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.fundoEscuro },
        headerTintColor: cores.branco,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="registrar" options={{ title: 'Registrar PR' }} />
      <Stack.Screen name="exercicio/[id]" options={{ title: 'Exercício' }} />
    </Stack>
  )
}
