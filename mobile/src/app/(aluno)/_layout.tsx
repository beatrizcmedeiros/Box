import { Stack } from 'expo-router'
import { cores } from '../../lib/tema'

/** Abas do aluno + telas que abrem por cima delas (registrar PR e detalhe do exercício). */
export default function LayoutAluno() {
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
