import { Stack } from 'expo-router'
import { cores } from '../../lib/tema'

/** Abas do treinador + telas abertas pelo menu "Mais" ou a partir das abas. */
export default function LayoutTreinador() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: cores.fundoEscuro },
        headerTintColor: cores.branco,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Stack.Screen name="(abas)" options={{ headerShown: false }} />
      <Stack.Screen name="consultar" options={{ title: 'Consultar cargas' }} />
      <Stack.Screen name="evolucao" options={{ title: 'Evolução das turmas' }} />
      <Stack.Screen name="importar" options={{ title: 'Importar lista do teste' }} />
      <Stack.Screen name="turmas" options={{ title: 'Turmas' }} />
      <Stack.Screen name="exercicios" options={{ title: 'Exercícios' }} />
      <Stack.Screen name="aluno" options={{ title: 'Aluno' }} />
    </Stack>
  )
}
