import Ionicons from '@expo/vector-icons/Ionicons'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { cores } from '../lib/tema'
import { Titulo } from './ui'

type Opcao<T> = { valor: T; rotulo: string }

/** Lista horizontal de opções (uma escolhida). Substitui o <select> da versão web. */
export function Chips<T extends string | number | null>({
  rotulo,
  opcoes,
  valor,
  aoEscolher,
}: {
  rotulo?: string
  opcoes: Opcao<T>[]
  valor: T
  aoEscolher: (valor: T) => void
}) {
  return (
    <View style={{ gap: 6 }}>
      {rotulo && <Titulo>{rotulo}</Titulo>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {opcoes.map((o) => {
          const ativo = o.valor === valor
          return (
            <Pressable
              key={String(o.valor)}
              accessibilityRole="radio"
              accessibilityState={{ selected: ativo }}
              onPress={() => aoEscolher(o.valor)}
              style={{
                marginRight: 8,
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: ativo ? cores.fundoEscuro : '#e2e8f0',
              }}
            >
              <Text style={{ fontWeight: '600', color: ativo ? cores.branco : '#334155' }}>
                {o.rotulo}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}

/** Campo de pesquisa com ícone de lupa e botão de limpar. */
export function Busca({
  valor,
  aoMudar,
  placeholder = 'Pesquisar aluno pelo nome ou apelido',
}: {
  valor: string
  aoMudar: (texto: string) => void
  placeholder?: string
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: cores.branco,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 46,
      }}
    >
      <Ionicons name="search" size={18} color={cores.textoSuave} />
      <TextInput
        accessibilityLabel={placeholder}
        value={valor}
        onChangeText={aoMudar}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        autoCorrect={false}
        style={{ flex: 1, fontSize: 16, color: cores.texto }}
      />
      {valor !== '' && (
        <Pressable accessibilityLabel="Limpar pesquisa" onPress={() => aoMudar('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={cores.textoSuave} />
        </Pressable>
      )}
    </View>
  )
}

/** Opções "Todas as turmas" + cada turma. */
export const opcoesTurma = (turmas: { id: number; nome: string }[] | undefined) => [
  { valor: null, rotulo: 'Todas as turmas' },
  ...(turmas ?? []).map((t) => ({ valor: t.id, rotulo: t.nome })),
]

/** Etiqueta pequena colorida (ex.: "Sem 1º acesso", "Inativo"). */
export function Etiqueta({
  children,
  cor = 'cinza',
}: {
  children: string
  cor?: 'cinza' | 'amarelo' | 'verde' | 'laranja' | 'vermelho'
}) {
  const estilo = {
    cinza: ['#f1f5f9', '#475569'],
    amarelo: ['#fef3c7', '#92400e'],
    verde: ['#dcfce7', '#166534'],
    laranja: [cores.marcaClara, cores.marcaEscura],
    vermelho: ['#fee2e2', '#991b1b'],
  }[cor]
  return (
    <Text
      style={{
        backgroundColor: estilo[0],
        color: estilo[1],
        fontSize: 11,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 999,
        overflow: 'hidden',
        alignSelf: 'flex-start',
      }}
    >
      {children}
    </Text>
  )
}
