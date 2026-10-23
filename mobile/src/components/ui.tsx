import Ionicons from '@expo/vector-icons/Ionicons'
import { type ReactNode, useState } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native'
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useOnline } from '../lib/cacheOffline'
import { Logo } from './Logo'
import { cores } from '../lib/tema'

// Espaço entre o campo em foco e o teclado (o teclado nunca cobre o que se está digitando)
const DISTANCIA_DO_TECLADO = 24

/**
 * Tela com rolagem e fundo padrão; com `atualizar`, puxar para baixo busca os dados de novo.
 * Ao digitar, a tela rola até o campo em foco ficar acima do teclado.
 */
export function Tela({
  children,
  atualizar,
}: {
  children: ReactNode
  atualizar?: { atualizando: boolean; aoPuxar: () => void }
}) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={DISTANCIA_DO_TECLADO}
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={estilos.tela}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        atualizar && (
          <RefreshControl
            refreshing={atualizar.atualizando}
            onRefresh={atualizar.aoPuxar}
            colors={[cores.marca]}
          />
        )
      }
    >
      <AvisoOffline />
      {children}
    </KeyboardAwareScrollView>
  )
}

/** Faixa mostrada sem internet: as telas exibem os dados salvos no aparelho. */
export function AvisoOffline() {
  const online = useOnline()
  if (online) return null
  return (
    <View accessibilityRole="alert" style={[estilos.alerta, { backgroundColor: cores.avisoFundo }]}>
      <Text style={{ color: cores.aviso, fontSize: 14 }}>
        Sem internet: mostrando os dados salvos no aparelho. Para salvar alterações, conecte-se.
      </Text>
    </View>
  )
}

/** Cabeçalho escuro com a marca, usado no login e no primeiro acesso. */
export function TelaPublica({ subtitulo, children }: { subtitulo: string; children: ReactNode }) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={DISTANCIA_DO_TECLADO}
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <SafeAreaView edges={['top']} style={estilos.cabecalhoPublico}>
        <Logo />
        <Text style={estilos.tituloPublico}>PR Box</Text>
        <Text style={estilos.subtituloPublico}>{subtitulo}</Text>
      </SafeAreaView>
      <View style={estilos.tela}>
        <AvisoOffline />
        {children}
      </View>
    </KeyboardAwareScrollView>
  )
}

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'link'

export function Botao({
  children,
  aoPressionar,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  precisaInternet = false,
  estilo,
}: {
  children: string
  aoPressionar: () => void
  variante?: VarianteBotao
  carregando?: boolean
  desabilitado?: boolean
  /** Desativa o botão sem conexão (ações que gravam no servidor). */
  precisaInternet?: boolean
  estilo?: ViewStyle
}) {
  const online = useOnline()
  const inativo = desabilitado || carregando || (precisaInternet && !online)
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      disabled={inativo}
      onPress={aoPressionar}
      style={({ pressed }) => [
        estilos.botao,
        estilosBotao[variante],
        inativo && { opacity: 0.6 },
        pressed && { opacity: 0.8 },
        estilo,
      ]}
    >
      {carregando ? (
        <ActivityIndicator
          color={variante === 'primario' || variante === 'perigo' ? '#fff' : cores.texto}
        />
      ) : (
        <Text style={[estilos.botaoTexto, textoBotao[variante]]}>{children}</Text>
      )}
    </Pressable>
  )
}

export function Campo({
  rotulo,
  erro,
  dica,
  grande,
  secureTextEntry,
  ...props
}: TextInputProps & { rotulo: string; erro?: string; dica?: string; grande?: boolean }) {
  // Campo de senha: o "olhinho" mostra ou oculta o que foi digitado
  const [senhaVisivel, setSenhaVisivel] = useState(false)
  const ehSenha = !!secureTextEntry

  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          accessibilityLabel={rotulo}
          placeholderTextColor="#94a3b8"
          secureTextEntry={ehSenha && !senhaVisivel}
          style={[
            estilos.campo,
            grande && estilos.campoGrande,
            ehSenha && { paddingRight: 48 },
            !!erro && { borderColor: cores.erro },
          ]}
          {...props}
        />
        {ehSenha && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={senhaVisivel ? 'Ocultar senha' : 'Mostrar senha'}
            onPress={() => setSenhaVisivel((v) => !v)}
            hitSlop={8}
            style={{ position: 'absolute', right: 12, padding: 4 }}
          >
            <Ionicons
              name={senhaVisivel ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={cores.textoSuave}
            />
          </Pressable>
        )}
      </View>
      {erro ? (
        <Text style={{ color: cores.erro, fontSize: 13 }}>{erro}</Text>
      ) : dica ? (
        <Text style={{ color: cores.textoSuave, fontSize: 13 }}>{dica}</Text>
      ) : null}
    </View>
  )
}

export function Alerta({
  tipo = 'erro',
  children,
}: {
  tipo?: 'erro' | 'sucesso' | 'info'
  children: ReactNode
}) {
  const estilo = {
    erro: { backgroundColor: cores.erroFundo, color: cores.erro },
    sucesso: { backgroundColor: cores.sucessoFundo, color: cores.sucesso },
    info: { backgroundColor: cores.avisoFundo, color: cores.aviso },
  }[tipo]
  return (
    <View
      accessibilityRole={tipo === 'erro' ? 'alert' : 'text'}
      style={[estilos.alerta, { backgroundColor: estilo.backgroundColor }]}
    >
      <Text style={{ color: estilo.color, fontSize: 14 }}>{children}</Text>
    </View>
  )
}

export function Cartao({ children, estilo }: { children: ReactNode; estilo?: ViewStyle }) {
  return <View style={[estilos.cartao, estilo]}>{children}</View>
}

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <View style={{ padding: 32, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={cores.marca} size="large" />
      <Text style={{ color: cores.textoSuave }}>{texto}</Text>
    </View>
  )
}

export function Titulo({ children }: { children: ReactNode }) {
  return <Text style={estilos.tituloSecao}>{children}</Text>
}

const estilosBotao = StyleSheet.create({
  primario: { backgroundColor: cores.marcaForte },
  secundario: { backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.fundoEscuro },
  perigo: { backgroundColor: '#dc2626' },
  link: { backgroundColor: 'transparent', paddingVertical: 8 },
})

const textoBotao = StyleSheet.create({
  primario: { color: cores.branco },
  secundario: { color: cores.fundoEscuro },
  perigo: { color: cores.branco },
  link: { color: cores.marcaEscura, fontSize: 14 },
})

export const estilos = StyleSheet.create({
  tela: { padding: 16, gap: 12, paddingBottom: 32 },
  cabecalhoPublico: {
    backgroundColor: cores.fundoEscuro,
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  tituloPublico: { color: cores.branco, fontSize: 24, fontWeight: '700' },
  subtituloPublico: { color: '#94a3b8', fontSize: 14, marginTop: 4, textAlign: 'center' },
  botao: {
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTexto: { fontSize: 16, fontWeight: '700' },
  rotulo: { fontSize: 14, fontWeight: '600', color: cores.texto },
  campo: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: cores.texto,
    backgroundColor: cores.branco,
  },
  campoGrande: { fontSize: 24, fontWeight: '800' },
  alerta: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  cartao: {
    backgroundColor: cores.branco,
    borderRadius: 16,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tituloSecao: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: cores.textoSuave,
  },
})
