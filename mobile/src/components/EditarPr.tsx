import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Modal, Text, View } from 'react-native'
import { KeyboardAvoidingView } from 'react-native-keyboard-controller'
import { api, ErroApi } from '../lib/api'
import { formatarKg, lerNumero } from '../lib/formato'
import { cores } from '../lib/tema'
import type { Lancamento } from '../lib/tipos'
import { CampoData } from './CampoData'
import { Alerta, Botao, Campo } from './ui'

/**
 * Folha para corrigir a data ou a carga de um PR. `caminho` é a rota de edição: a do aluno
 * (/me/prs/lancamentos/:id) ou a da gestão (/c/:contexto/alunos/:id/prs/:prId).
 */
export function EditarPr({
  titulo,
  pr,
  caminho,
  aoFechar,
  aoSalvar,
}: {
  titulo: string
  pr: Lancamento
  caminho: string
  aoFechar: () => void
  aoSalvar: () => void
}) {
  const [dataTeste, setDataTeste] = useState(pr.dataTeste)
  const [carga, setCarga] = useState(formatarKg(pr.cargaKg))

  const salvar = useMutation({
    mutationFn: () => {
      const cargaKg = lerNumero(carga)
      return api<Lancamento>(caminho, {
        method: 'PUT',
        body: { dataTeste, cargaKg: Number.isNaN(cargaKg) ? carga : cargaKg },
      })
    },
    onSuccess: aoSalvar,
  })
  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  return (
    <Modal visible transparent animationType="slide" onRequestClose={aoFechar}>
      {/* A folha sobe junto com o teclado: o campo de carga fica visível */}
      <KeyboardAvoidingView
        behavior="padding"
        style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}
      >
        <View
          style={{
            backgroundColor: cores.branco,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            gap: 14,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto }}>{titulo}</Text>
          <CampoData
            rotulo="Data do teste de carga"
            valor={dataTeste}
            aoMudar={setDataTeste}
            erro={erro?.doCampo('dataTeste')}
          />
          <Campo
            rotulo="Carga máxima (PR) em kg"
            value={carga}
            onChangeText={setCarga}
            keyboardType="decimal-pad"
            erro={erro?.doCampo('cargaKg')}
          />
          {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Botao variante="secundario" aoPressionar={aoFechar} estilo={{ flex: 1 }}>
              Cancelar
            </Botao>
            <Botao
              aoPressionar={() => salvar.mutate()}
              carregando={salvar.isPending}
              precisaInternet
              estilo={{ flex: 1 }}
            >
              Salvar
            </Botao>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
