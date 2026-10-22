import { useState } from 'react'
import { Text, View } from 'react-native'
import { formatarData } from '../lib/formato'
import { cores } from '../lib/tema'
import type { CodigoVinculo, Validade } from '../lib/tipos'
import { Chips } from './seletores'
import { Alerta, Botao, Cartao } from './ui'

const VALIDADES: { valor: Validade; rotulo: string }[] = [
  { valor: '15', rotulo: '15 dias' },
  { valor: '30', rotulo: '30 dias' },
  { valor: 'nunca', rotulo: 'Sem validade' },
]

/** "123456" → "123 456", mais fácil de ditar no box. */
const separar = (codigo: string) => `${codigo.slice(0, 3)} ${codigo.slice(3)}`

/** Código de vínculo atual, com a validade e as ações de gerar outro ou desativar. */
export function CartaoCodigo({
  titulo,
  descricao,
  codigo,
  gerando,
  erro,
  aoGerar,
  aoDesativar,
}: {
  titulo: string
  descricao: string
  codigo: CodigoVinculo | null
  gerando: boolean
  erro?: string
  aoGerar: (validade: Validade) => void
  aoDesativar: () => void
}) {
  const [validade, setValidade] = useState<Validade>('30')

  return (
    <Cartao estilo={{ gap: 12 }}>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>{titulo}</Text>
        <Text style={{ fontSize: 13, color: cores.textoSuave }}>{descricao}</Text>
      </View>
      <View
        style={{
          backgroundColor: cores.cinzaClaro,
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
        }}
      >
        {codigo ? (
          <>
            <Text
              selectable
              accessibilityLabel={`Código ${codigo.codigo}`}
              style={{ fontSize: 34, fontWeight: '800', letterSpacing: 4, color: cores.texto }}
            >
              {separar(codigo.codigo)}
            </Text>
            <Text style={{ fontSize: 12, color: cores.textoSuave }}>
              {codigo.expiraEm
                ? `Vale até ${formatarData(codigo.expiraEm.slice(0, 10))}`
                : 'Sem validade'}
            </Text>
          </>
        ) : (
          <Text style={{ color: cores.textoSuave }}>Nenhum código ativo.</Text>
        )}
      </View>
      {erro && <Alerta>{erro}</Alerta>}
      <Chips rotulo="Validade" opcoes={VALIDADES} valor={validade} aoEscolher={setValidade} />
      <Botao aoPressionar={() => aoGerar(validade)} carregando={gerando} precisaInternet>
        {codigo ? 'Gerar novo código' : 'Gerar código'}
      </Botao>
      {codigo && (
        <>
          <Botao variante="link" aoPressionar={aoDesativar} precisaInternet>
            Desativar código
          </Botao>
          <Text style={{ fontSize: 12, color: cores.textoSuave }}>
            Gerar um novo código desativa o anterior. Quem já se vinculou continua vinculado.
          </Text>
        </>
      )}
    </Cartao>
  )
}
