import Ionicons from '@expo/vector-icons/Ionicons'
import { Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { cores } from '../../../lib/tema'

type Icone = ComponentProps<typeof Ionicons>['name']

const icone =
  (nome: Icone) =>
  // As cores das abas são as strings de tabBarActiveTintColor/tabBarInactiveTintColor
  ({ color, size }: { color: unknown; size: number }) => (
    <Ionicons name={nome} color={typeof color === 'string' ? color : undefined} size={size} />
  )

export default function AbasAluno() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: cores.fundoEscuro },
        headerTintColor: cores.branco,
        headerTitleStyle: { fontWeight: '700' },
        tabBarActiveTintColor: cores.marcaForte,
        tabBarInactiveTintColor: cores.textoSuave,
        sceneStyle: { backgroundColor: cores.fundo },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Percentuais',
          headerTitle: 'Percentuais de carga',
          tabBarIcon: icone('calculator-outline'),
        }}
      />
      <Tabs.Screen
        name="prs"
        options={{ title: 'Meus PRs', tabBarIcon: icone('trophy-outline') }}
      />
      <Tabs.Screen
        name="evolucao"
        options={{ title: 'Evolução', tabBarIcon: icone('trending-up-outline') }}
      />
      <Tabs.Screen
        name="perfil"
        options={{ title: 'Perfil', tabBarIcon: icone('person-circle-outline') }}
      />
    </Tabs>
  )
}
