import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Text, View } from 'react-native'
import { CartaoCodigo } from '../../components/CartaoCodigo'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela } from '../../components/ui'
import { api, ErroApi } from '../../lib/api'
import { useUsuario } from '../../lib/sessao'
import { cores } from '../../lib/tema'
import type { CodigoVinculo, Validade, Vinculos } from '../../lib/tipos'

/** Códigos para alunos (e professores) se vincularem; o professor também entra em academias aqui. */
export default function Codigos() {
  const { data: usuario } = useUsuario()
  return (
    <Tela>
      <Text style={{ color: cores.textoSuave }}>
        Passe o código para quem vai se vincular. A pessoa digita o código no app ou na web, em
        Vínculos.
      </Text>
      {usuario?.tipo === 'ACADEMIA' ? <CodigosDaAcademia /> : <CodigosDoProfessor />}
    </Tela>
  )
}

type CodigosAcademia = { alunos: CodigoVinculo | null; professores: CodigoVinculo | null }

function CodigosDaAcademia() {
  const cliente = useQueryClient()
  const codigos = useQuery({
    queryKey: ['codigos', 'academia'],
    queryFn: () => api<CodigosAcademia>('/academia/codigos'),
  })
  const atualizar = () => cliente.invalidateQueries({ queryKey: ['codigos', 'academia'] })
  const gerar = useMutation({
    mutationFn: ({ tipo, validade }: { tipo: 'alunos' | 'professores'; validade: Validade }) =>
      api(`/academia/codigos/${tipo}`, { method: 'POST', body: { validade } }),
    onSuccess: atualizar,
  })
  const desativar = useMutation({
    mutationFn: (tipo: 'alunos' | 'professores') =>
      api<void>(`/academia/codigos/${tipo}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  if (codigos.isPending) return <Carregando />
  if (codigos.error) return <Alerta>{codigos.error.message}</Alerta>

  return (
    <>
      <CartaoCodigo
        titulo="Código para alunos"
        descricao="O aluno se vincula à academia: todos os professores dela passam a ver os PRs dele."
        codigo={codigos.data.alunos}
        gerando={gerar.isPending && gerar.variables?.tipo === 'alunos'}
        erro={gerar.error?.message}
        aoGerar={(validade) => gerar.mutate({ tipo: 'alunos', validade })}
        aoDesativar={() => desativar.mutate('alunos')}
      />
      <CartaoCodigo
        titulo="Código para professores"
        descricao="O professor passa a fazer parte da academia e vê todos os alunos e turmas dela."
        codigo={codigos.data.professores}
        gerando={gerar.isPending && gerar.variables?.tipo === 'professores'}
        aoGerar={(validade) => gerar.mutate({ tipo: 'professores', validade })}
        aoDesativar={() => desativar.mutate('professores')}
      />
    </>
  )
}

function CodigosDoProfessor() {
  const cliente = useQueryClient()
  const codigo = useQuery({
    queryKey: ['codigos', 'professor'],
    queryFn: () => api<{ codigo: CodigoVinculo | null }>('/professor/codigo'),
  })
  const atualizar = () => cliente.invalidateQueries({ queryKey: ['codigos', 'professor'] })
  const gerar = useMutation({
    mutationFn: (validade: Validade) =>
      api('/professor/codigo', { method: 'POST', body: { validade } }),
    onSuccess: atualizar,
  })
  const desativar = useMutation({
    mutationFn: () => api<void>('/professor/codigo', { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  return (
    <>
      {codigo.isPending ? (
        <Carregando />
      ) : codigo.error ? (
        <Alerta>{codigo.error.message}</Alerta>
      ) : (
        <CartaoCodigo
          titulo="Código para os seus alunos"
          descricao={
            'O aluno se vincula a você e aparece em "Meus alunos". Só você vê os PRs dele.'
          }
          codigo={codigo.data.codigo}
          gerando={gerar.isPending}
          erro={gerar.error?.message}
          aoGerar={(validade) => gerar.mutate(validade)}
          aoDesativar={() => desativar.mutate()}
        />
      )}
      <AcademiasOndeEnsina />
    </>
  )
}

/** O professor entra numa academia com o código de professores dela, ou sai. */
function AcademiasOndeEnsina() {
  const cliente = useQueryClient()
  const vinculos = useQuery({ queryKey: ['vinculos'], queryFn: () => api<Vinculos>('/vinculos') })
  const [codigo, setCodigo] = useState('')
  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['vinculos'] })
    cliente.invalidateQueries({ queryKey: ['contextos'] })
  }
  const entrar = useMutation({
    mutationFn: () => api('/vinculos/codigo', { method: 'POST', body: { codigo } }),
    onSuccess: () => {
      setCodigo('')
      atualizar()
    },
  })
  const sair = useMutation({
    mutationFn: (academiaId: number) =>
      api<void>(`/vinculos/academias/${academiaId}`, { method: 'DELETE' }),
    onSuccess: atualizar,
  })
  const erro = entrar.error instanceof ErroApi ? entrar.error : null

  return (
    <Cartao estilo={{ gap: 10 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>
        Academias onde você dá aula
      </Text>
      <Campo
        rotulo="Código de professores da academia"
        value={codigo}
        onChangeText={(t) => setCodigo(t.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
      />
      {erro && <Alerta>{erro.message}</Alerta>}
      {entrar.isSuccess && (
        <Alerta tipo="sucesso">Pronto! Escolha a academia em Mais → Trabalhando em.</Alerta>
      )}
      <Botao
        aoPressionar={() => entrar.mutate()}
        carregando={entrar.isPending}
        desabilitado={codigo.length !== 6}
        precisaInternet
      >
        Entrar na academia
      </Botao>
      {vinculos.data?.academiasOndeEnsina.map((a) => (
        <View
          key={a.id}
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text style={{ color: cores.texto }}>{a.nome}</Text>
          <Botao
            variante="link"
            precisaInternet
            aoPressionar={() =>
              Alert.alert(
                'Sair da academia',
                `Sair de ${a.nome}? Você deixa de ver os alunos dela.`,
                [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Sair', style: 'destructive', onPress: () => sair.mutate(a.id) },
                ],
              )
            }
          >
            Sair
          </Botao>
        </View>
      ))}
    </Cartao>
  )
}
