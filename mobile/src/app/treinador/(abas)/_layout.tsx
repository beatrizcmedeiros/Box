import Ionicons from '@expo/vector-icons/Ionicons'
import { router, Tabs } from 'expo-router'
import type { ComponentProps } from 'react'
import { useUsuario } from '../../../lib/sessao'
import { cores } from '../../../lib/tema'

type Icone = ComponentProps<typeof Ionicons>['name']

const icone =
  (nome: Icone) =>
  // As cores das abas são as strings de tabBarActiveTintColor/tabBarInactiveTintColor
  ({ color, size }: { color: unknown; size: number }) => (
    <Ionicons name={nome} color={typeof color === 'string' ? color : undefined} size={size} />
  )

/** As telas mais usadas no box ficam nas abas; as demais, em "Mais". */
export default function AbasTreinador() {
  // A academia não tem PRs próprios; o professor tem "Meus PRs" como as outras abas
  const professor = useUsuario().data?.tipo === 'PESSOA'
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
        options={{ title: 'Início', headerTitle: 'Visão geral', tabBarIcon: icone('home-outline') }}
      />
      <Tabs.Screen
        name="teste-de-carga"
        options={{
          title: 'Teste',
          headerTitle: 'Teste de carga',
          tabBarIcon: icone('barbell-outline'),
        }}
      />
      <Tabs.Screen
        name="percentuais"
        options={{
          title: 'Percentuais',
          headerTitle: 'Percentuais dos alunos',
          tabBarIcon: icone('calculator-outline'),
        }}
      />
      <Tabs.Screen
        name="alunos"
        options={{ title: 'Alunos', tabBarIcon: icone('people-outline') }}
      />
      <Tabs.Screen
        name="meus-prs"
        options={{
          title: 'Meus PRs',
          tabBarIcon: icone('trophy-outline'),
          href: professor ? undefined : null,
        }}
        listeners={{
          tabPress: (evento) => {
            // Abre a área do aluno (os PRs do próprio professor), por cima da gestão
            evento.preventDefault()
            router.push('/')
          },
        }}
      />
      <Tabs.Screen name="mais" options={{ title: 'Mais', tabBarIcon: icone('menu-outline') }} />
    </Tabs>
  )
}
