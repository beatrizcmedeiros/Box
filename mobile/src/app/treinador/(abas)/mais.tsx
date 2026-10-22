import Ionicons from '@expo/vector-icons/Ionicons'
import { type Href, router } from 'expo-router'
import type { ComponentProps } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Alerta, Botao, Cartao, Tela } from '../../../components/ui'
import { useLogout, useUsuario } from '../../../lib/sessao'
import { cores } from '../../../lib/tema'

const itens: {
  para: Href
  rotulo: string
  descricao: string
  icone: ComponentProps<typeof Ionicons>['name']
}[] = [
  {
    para: '/treinador/consultar',
    rotulo: 'Consultar cargas',
    descricao: 'PR vigente de cada aluno, com filtros e ordenação',
    icone: 'list-outline',
  },
  {
    para: '/treinador/evolucao',
    rotulo: 'Evolução das turmas',
    descricao: 'Média por turma e evolução de cada aluno a cada teste',
    icone: 'trending-up-outline',
  },
  {
    para: '/treinador/importar',
    rotulo: 'Importar lista do teste',
    descricao: 'Cole o texto da nota (ex.: "Ana 55kg") e revise antes de gravar',
    icone: 'clipboard-outline',
  },
  {
    para: '/treinador/turmas',
    rotulo: 'Turmas',
    descricao: 'Cadastrar, renomear e remover turmas',
    icone: 'time-outline',
  },
  {
    para: '/treinador/exercicios',
    rotulo: 'Exercícios',
    descricao: 'Exercícios e nomes alternativos usados nas listas',
    icone: 'barbell-outline',
  },
]

export default function Mais() {
  const { data: usuario } = useUsuario()
  const logout = useLogout()

  return (
    <Tela>
      <Cartao estilo={{ paddingVertical: 4 }}>
        {itens.map((item, i) => (
          <Pressable
            key={item.rotulo}
            accessibilityRole="button"
            onPress={() => router.push(item.para)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: cores.cinzaClaro,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name={item.icone} size={22} color={cores.marcaForte} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: cores.texto }}>
                {item.rotulo}
              </Text>
              <Text style={{ fontSize: 13, color: cores.textoSuave }}>{item.descricao}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={cores.textoSuave} />
          </Pressable>
        ))}
      </Cartao>

      <Cartao estilo={{ gap: 2 }}>
        <Text style={{ fontWeight: '600', color: cores.texto }}>{usuario?.nome}</Text>
        <Text style={{ color: cores.textoSuave }}>{usuario?.email}</Text>
      </Cartao>
      {logout.error && <Alerta>Sem conexão: para sair da conta, conecte-se à internet.</Alerta>}
      <Botao
        variante="secundario"
        aoPressionar={() => logout.mutate()}
        carregando={logout.isPending}
      >
        Sair
      </Botao>
    </Tela>
  )
}
