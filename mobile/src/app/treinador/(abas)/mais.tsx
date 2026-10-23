import Ionicons from '@expo/vector-icons/Ionicons'
import { type Href, router } from 'expo-router'
import type { ComponentProps } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Chips } from '../../../components/seletores'
import { Alerta, Botao, Cartao, Tela } from '../../../components/ui'
import { useContexto } from '../../../lib/contexto'
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
    para: '/treinador/codigos',
    rotulo: 'Códigos de vínculo',
    descricao: 'Códigos para os alunos (e professores) se vincularem',
    icone: 'key-outline',
  },
  {
    para: '/treinador/turmas',
    rotulo: 'Turmas',
    descricao: 'Turmas (e, em "Meus alunos", os locais onde você dá aula)',
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
  const ehAcademia = usuario?.tipo === 'ACADEMIA'
  const menu = [
    ...itens,
    ...(ehAcademia
      ? [
          {
            para: '/treinador/professores' as Href,
            rotulo: 'Professores',
            descricao: 'Professores da academia',
            icone: 'people-circle-outline' as const,
          },
        ]
      : []),
  ]

  return (
    <Tela>
      <SeletorContexto />
      <Cartao estilo={{ paddingVertical: 4 }}>
        {menu.map((item, i) => (
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

/** Onde a pessoa está trabalhando: cada academia ou "Meus alunos". */
function SeletorContexto() {
  const { contexto, contextos, trocar } = useContexto()
  if (contextos.length < 2) {
    return (
      <Cartao>
        <Text style={{ fontSize: 12, color: cores.textoSuave }}>Trabalhando em</Text>
        <Text style={{ fontWeight: '700', color: cores.texto }}>{contexto.nome}</Text>
      </Cartao>
    )
  }
  return (
    <Cartao>
      <Chips
        rotulo="Trabalhando em"
        opcoes={contextos.map((c) => ({ valor: c.id, rotulo: c.nome }))}
        valor={contexto.id}
        aoEscolher={trocar}
      />
    </Cartao>
  )
}
