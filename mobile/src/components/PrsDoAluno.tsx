import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Text, View } from 'react-native'
import { api, gestao } from '../lib/api'
import { useIdContexto } from '../lib/contexto'
import { formatarData, formatarKg } from '../lib/formato'
import { cores } from '../lib/tema'
import type { Lancamento } from '../lib/tipos'
import { EditarPr } from './EditarPr'
import { Alerta, Botao, Cartao, Carregando, Titulo } from './ui'

type PrDoAluno = Lancamento & { exercicio: { id: number; nome: string } }

/** Todos os PRs de um aluno vinculado, com a opção de corrigir a data ou a carga. */
export function PrsDoAluno({ alunoId }: { alunoId: number }) {
  const cliente = useQueryClient()
  const ctx = useIdContexto()
  const [editando, setEditando] = useState<PrDoAluno | null>(null)
  const prs = useQuery({
    queryKey: ['prs-do-aluno', ctx, alunoId],
    queryFn: () => api<PrDoAluno[]>(gestao(`/alunos/${alunoId}/prs`)),
  })

  return (
    <Cartao estilo={{ gap: 4 }}>
      <Titulo>PRs do aluno</Titulo>
      {prs.isPending ? (
        <Carregando />
      ) : prs.error ? (
        <Alerta>{prs.error.message}</Alerta>
      ) : prs.data.length === 0 ? (
        <Text style={{ color: cores.textoSuave }}>Este aluno ainda não tem PRs registrados.</Text>
      ) : (
        prs.data.map((pr, i) => (
          <View
            key={pr.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              paddingVertical: 8,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: cores.cinzaClaro,
            }}
          >
            <View style={{ flexShrink: 1 }}>
              <Text style={{ fontWeight: '700', color: cores.texto }}>{pr.exercicio.nome}</Text>
              <Text style={{ fontSize: 12, color: cores.textoSuave }}>
                {formatarData(pr.dataTeste)}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '700', color: cores.texto }}>
                {formatarKg(pr.cargaKg)} kg
              </Text>
              <Botao
                variante="link"
                aoPressionar={() => setEditando(pr)}
                estilo={{ minHeight: 36, paddingVertical: 4, paddingHorizontal: 8 }}
              >
                Editar
              </Botao>
            </View>
          </View>
        ))
      )}

      {editando && (
        <EditarPr
          titulo={`Editar PR de ${editando.exercicio.nome}`}
          pr={editando}
          caminho={gestao(`/alunos/${alunoId}/prs/${editando.id}`)}
          aoFechar={() => setEditando(null)}
          aoSalvar={() => {
            setEditando(null)
            // PR alterado muda percentuais, consultas e evolução
            for (const chave of [
              'prs-do-aluno',
              'percentuais',
              'cargas',
              'evolucao',
              'lancamentos',
            ]) {
              cliente.invalidateQueries({ queryKey: [chave] })
            }
          }}
        />
      )}
    </Cartao>
  )
}
