import Ionicons from '@expo/vector-icons/Ionicons'
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Platform, Pressable, Text, View } from 'react-native'
import { formatarData, hojeIso } from '../lib/formato'
import { cores } from '../lib/tema'
import { estilos } from './ui'

/** "2026-03-15" → Date local (meia-noite), sem pular de dia por causa do fuso. */
function paraDate(iso: string) {
  const [ano, mes, dia] = iso.split('-').map(Number)
  return new Date(ano, mes - 1, dia)
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')
const paraIso = (data: Date) =>
  `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`

/**
 * Campo de data com calendário: toque para escolher o dia. `valor` e `aoMudar` usam
 * "AAAA-MM-DD"; por padrão, não deixa escolher datas no futuro.
 */
export function CampoData({
  rotulo,
  valor,
  aoMudar,
  erro,
  maximo = hojeIso(),
}: {
  rotulo: string
  valor: string
  aoMudar: (iso: string) => void
  erro?: string
  maximo?: string
}) {
  // No iOS o calendário aparece embaixo do campo; no Android, numa janela do sistema
  const [aberto, setAberto] = useState(false)

  function abrir() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: paraDate(valor),
        mode: 'date',
        maximumDate: paraDate(maximo),
        onChange: (evento, data) => {
          if (evento.type === 'set' && data) aoMudar(paraIso(data))
        },
      })
    } else {
      setAberto((a) => !a)
    }
  }

  return (
    <View style={{ gap: 6 }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${formatarData(valor)}`}
        accessibilityHint="Abre o calendário"
        onPress={abrir}
        style={[
          estilos.campo,
          {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          !!erro && { borderColor: cores.erro },
        ]}
      >
        <Text style={{ fontSize: 16, color: cores.texto }}>{formatarData(valor)}</Text>
        <Ionicons name="calendar-outline" size={22} color={cores.textoSuave} />
      </Pressable>
      {aberto && Platform.OS !== 'android' && (
        <DateTimePicker
          value={paraDate(valor)}
          mode="date"
          display="inline"
          maximumDate={paraDate(maximo)}
          onChange={(_evento, data) => data && aoMudar(paraIso(data))}
        />
      )}
      {erro ? <Text style={{ color: cores.erro, fontSize: 13 }}>{erro}</Text> : null}
    </View>
  )
}
