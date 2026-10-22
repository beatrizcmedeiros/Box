import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Alert, Switch, Text, View } from 'react-native'
import { Chips, Etiqueta } from '../../components/seletores'
import { Alerta, Botao, Campo, Cartao, Carregando, Tela, Titulo } from '../../components/ui'
import { api, ErroApi, gestao } from '../../lib/api'
import { useExercicios } from '../../lib/consultasTreinador'
import { cores } from '../../lib/tema'
import { CATEGORIAS, type CategoriaExercicio, type Exercicio } from '../../lib/tipos'

/** Exercícios e os nomes alternativos usados nas listas do teste. */
export default function Exercicios() {
  const exercicios = useExercicios()
  const [editando, setEditando] = useState<Exercicio | 'novo' | null>(null)

  return (
    <Tela atualizar={{ atualizando: exercicios.isRefetching, aoPuxar: () => exercicios.refetch() }}>
      {editando ? (
        <FormularioExercicio
          key={editando === 'novo' ? 'novo' : editando.id}
          exercicio={editando === 'novo' ? undefined : editando}
          aoFechar={() => setEditando(null)}
        />
      ) : (
        <Botao aoPressionar={() => setEditando('novo')}>+ Novo exercício</Botao>
      )}

      {exercicios.isPending ? (
        <Carregando />
      ) : exercicios.error ? (
        <Alerta>{exercicios.error.message}</Alerta>
      ) : (
        <Cartao estilo={{ paddingVertical: 4 }}>
          {exercicios.data.map((e, i) => (
            <View
              key={e.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 10,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: cores.cinzaClaro,
              }}
            >
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={{ fontSize: 15, fontWeight: '600', color: cores.texto }}>
                  {e.nome}
                </Text>
                <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                  {CATEGORIAS[e.categoria]}
                  {e.aliases.length > 0 ? ` · também: ${e.aliases.join(', ')}` : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {!e.editavel && <Etiqueta cor="verde">Padrão</Etiqueta>}
                  {!e.ativo && <Etiqueta cor="vermelho">Inativo</Etiqueta>}
                </View>
              </View>
              <Botao variante="link" aoPressionar={() => setEditando(e)}>
                {e.editavel ? 'Editar' : 'Nomes'}
              </Botao>
            </View>
          ))}
        </Cartao>
      )}
    </Tela>
  )
}

function FormularioExercicio({
  exercicio,
  aoFechar,
}: {
  exercicio?: Exercicio
  aoFechar: () => void
}) {
  const cliente = useQueryClient()
  const [nome, setNome] = useState(exercicio?.nome ?? '')
  const [categoria, setCategoria] = useState<CategoriaExercicio>(
    exercicio?.categoria ?? 'LEVANTAMENTO',
  )
  const [aliases, setAliases] = useState(exercicio?.aliases.join(', ') ?? '')
  const [ativo, setAtivo] = useState(exercicio?.ativo ?? true)

  const atualizar = () => {
    cliente.invalidateQueries({ queryKey: ['exercicios'] })
    cliente.invalidateQueries({ queryKey: ['exercicios-ativos'] })
    aoFechar()
  }

  // Exercício da lista padrão: só os nomes alternativos (deste contexto) podem mudar
  const somenteAliases = !!exercicio && !exercicio.editavel

  const salvar = useMutation({
    mutationFn: () => {
      const lista = aliases
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean)
      if (somenteAliases) {
        return api<Exercicio>(gestao(`/exercicios/${exercicio.id}/aliases`), {
          method: 'PUT',
          body: { aliases: lista },
        })
      }
      const corpo = { nome, categoria, ativo, aliases: lista }
      return exercicio
        ? api<Exercicio>(gestao(`/exercicios/${exercicio.id}`), { method: 'PUT', body: corpo })
        : api<Exercicio>(gestao('/exercicios'), { method: 'POST', body: corpo })
    },
    onSuccess: atualizar,
  })

  const excluir = useMutation({
    mutationFn: () => api<void>(gestao(`/exercicios/${exercicio!.id}`), { method: 'DELETE' }),
    onSuccess: atualizar,
  })

  const erro = salvar.error instanceof ErroApi ? salvar.error : null

  return (
    <Cartao estilo={{ gap: 12 }}>
      <Text style={{ fontSize: 16, fontWeight: '700', color: cores.texto }}>
        {somenteAliases ? exercicio.nome : exercicio ? 'Editar exercício' : 'Novo exercício'}
      </Text>
      {somenteAliases ? (
        <Text style={{ fontSize: 13, color: cores.textoSuave }}>
          Faz parte da lista padrão do PR Box. Você pode acrescentar os nomes com que ele aparece
          nas suas listas; eles valem só aqui.
        </Text>
      ) : (
        <>
          <Campo rotulo="Nome" value={nome} onChangeText={setNome} erro={erro?.doCampo('nome')} />
          <Chips
            rotulo="Categoria"
            opcoes={(Object.keys(CATEGORIAS) as CategoriaExercicio[]).map((c) => ({
              valor: c,
              rotulo: CATEGORIAS[c],
            }))}
            valor={categoria}
            aoEscolher={setCategoria}
          />
        </>
      )}
      <Campo
        rotulo="Nomes alternativos (separados por vírgula)"
        value={aliases}
        onChangeText={setAliases}
        dica="Como o exercício aparece na lista do teste (ex.: agachamento)"
      />
      {exercicio && !somenteAliases && (
        <View
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View style={{ flexShrink: 1 }}>
            <Titulo>Ativo</Titulo>
            <Text style={{ fontSize: 13, color: cores.textoSuave }}>
              Exercícios inativos não aparecem para registrar PR
            </Text>
          </View>
          <Switch
            accessibilityLabel="Exercício ativo"
            value={ativo}
            onValueChange={setAtivo}
            trackColor={{ true: cores.marca }}
          />
        </View>
      )}
      {erro && erro.campos.length === 0 && <Alerta>{erro.message}</Alerta>}
      {excluir.error && <Alerta>{excluir.error.message}</Alerta>}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Botao variante="secundario" aoPressionar={aoFechar} estilo={{ flex: 1 }}>
          Cancelar
        </Botao>
        <Botao
          aoPressionar={() => salvar.mutate()}
          precisaInternet
          carregando={salvar.isPending}
          estilo={{ flex: 1 }}
        >
          Salvar
        </Botao>
      </View>
      {exercicio && !somenteAliases && (
        <Botao
          variante="link"
          carregando={excluir.isPending}
          aoPressionar={() =>
            Alert.alert(
              'Excluir exercício',
              `Excluir ${exercicio.nome}? Só é possível se ainda não houver testes de carga dele.`,
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Excluir', style: 'destructive', onPress: () => excluir.mutate() },
              ],
            )
          }
        >
          Excluir exercício
        </Botao>
      )}
    </Cartao>
  )
}
