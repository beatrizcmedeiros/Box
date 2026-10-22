import { Stack } from 'expo-router'
import { ProvedorContexto } from '../../lib/contexto'
import { cores } from '../../lib/tema'

/** Gestão (professor ou academia): abas + telas do menu "Mais", sempre num contexto. */
export default function LayoutTreinador() {
  return (
    <ProvedorContexto>
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
        <Stack.Screen name="aluno" options={{ title: 'Organizar aluno' }} />
        <Stack.Screen name="codigos" options={{ title: 'Códigos de vínculo' }} />
        <Stack.Screen name="professores" options={{ title: 'Professores' }} />
      </Stack>
    </ProvedorContexto>
  )
}
