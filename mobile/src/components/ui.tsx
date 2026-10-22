import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { cores } from '../lib/tema'

/** Tela com rolagem e fundo padrão; com `atualizar`, puxar para baixo busca os dados de novo. */
export function Tela({
  children,
  atualizar,
}: {
  children: ReactNode
  atualizar?: { atualizando: boolean; aoPuxar: () => void }
}) {
  return (
    <ScrollView
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
      {children}
    </ScrollView>
  )
}

/** Cabeçalho escuro com a marca, usado no login e no primeiro acesso. */
export function TelaPublica({ subtitulo, children }: { subtitulo: string; children: ReactNode }) {
  return (
    <ScrollView
      style={{ backgroundColor: cores.fundo }}
      contentContainerStyle={{ flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
    >
      <SafeAreaView edges={['top']} style={estilos.cabecalhoPublico}>
        <View style={estilos.logo}>
          <Text style={estilos.logoTexto}>PR</Text>
        </View>
        <Text style={estilos.tituloPublico}>PR Box</Text>
        <Text style={estilos.subtituloPublico}>{subtitulo}</Text>
      </SafeAreaView>
      <View style={estilos.tela}>{children}</View>
    </ScrollView>
  )
}

type VarianteBotao = 'primario' | 'secundario' | 'perigo' | 'link'

export function Botao({
  children,
  aoPressionar,
  variante = 'primario',
  carregando = false,
  desabilitado = false,
  estilo,
}: {
  children: string
  aoPressionar: () => void
  variante?: VarianteBotao
  carregando?: boolean
  desabilitado?: boolean
  estilo?: ViewStyle
}) {
  const inativo = desabilitado || carregando
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
  ...props
}: TextInputProps & { rotulo: string; erro?: string; dica?: string; grande?: boolean }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        accessibilityLabel={rotulo}
        placeholderTextColor="#94a3b8"
        style={[
          estilos.campo,
          grande && estilos.campoGrande,
          !!erro && { borderColor: cores.erro },
        ]}
        {...props}
      />
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
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: cores.marcaForte,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoTexto: { color: cores.branco, fontSize: 24, fontWeight: '800' },
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
