import { useState } from 'react'
import { Pressable, ScrollView, Text } from 'react-native'
import { BotaoRegistrar, CartaoPercentuais } from '../../../components/aluno'
import { SeletorBasePr } from '../../../components/SeletorBasePr'
import { Alerta, Cartao, Carregando, Tela } from '../../../components/ui'
import { useBasePr } from '../../../lib/basePr'
import { usePrs } from '../../../lib/consultas'
import { useUsuario } from '../../../lib/sessao'
import { cores } from '../../../lib/tema'
import type { CategoriaExercicio } from '../../../lib/tipos'

const filtros: { valor: CategoriaExercicio | null; rotulo: string }[] = [
  { valor: null, rotulo: 'Todos' },
  { valor: 'LEVANTAMENTO', rotulo: 'Levantamentos' },
  { valor: 'OLIMPICO', rotulo: 'Olímpicos' },
]

/** Tela inicial do aluno: cargas de 35% a 55% do PR de cada exercício. */
export default function Percentuais() {
  const { data: usuario } = useUsuario()
  const [base] = useBasePr()
  const prs = usePrs(base)
  const [categoria, setCategoria] = useState<CategoriaExercicio | null>(null)

  const visiveis = prs.data?.filter((r) => !categoria || r.exercicio.categoria === categoria) ?? []
  const categoriasComPr = new Set(prs.data?.map((r) => r.exercicio.categoria))

  return (
    <Tela atualizar={{ atualizando: prs.isRefetching, aoPuxar: () => prs.refetch() }}>
      <Text style={{ color: cores.textoSuave }}>
        {usuario?.nome.split(' ')[0]} · calculados a partir dos seus PRs
      </Text>
      {prs.isPending ? (
        <Carregando />
      ) : prs.error ? (
        <Alerta>{prs.error.message}</Alerta>
      ) : prs.data.length === 0 ? (
        <Cartao estilo={{ gap: 12, alignItems: 'center', padding: 24 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: cores.texto }}>
            Nenhum PR registrado ainda
          </Text>
          <Text style={{ textAlign: 'center', color: cores.textoSuave }}>
            Registre a carga máxima do seu último teste de força e o PR Box calcula na hora as
            cargas de 35% a 55% para os treinos.
          </Text>
          <BotaoRegistrar texto="+ Registrar meu primeiro PR" />
        </Cartao>
      ) : (
        <>
          <SeletorBasePr />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filtros
              .filter((f) => !f.valor || categoriasComPr.has(f.valor))
              .map((f) => {
                const ativo = categoria === f.valor
                return (
                  <Pressable
                    key={f.rotulo}
                    accessibilityRole="button"
                    accessibilityState={{ selected: ativo }}
                    onPress={() => setCategoria(f.valor)}
                    style={{
                      marginRight: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: ativo ? cores.fundoEscuro : '#e2e8f0',
                    }}
                  >
                    <Text style={{ fontWeight: '600', color: ativo ? cores.branco : '#334155' }}>
                      {f.rotulo}
                    </Text>
                  </Pressable>
                )
              })}
          </ScrollView>
          {visiveis.map((resumo) => (
            <CartaoPercentuais key={resumo.exercicio.id} resumo={resumo} />
          ))}
          <BotaoRegistrar />
        </>
      )}
    </Tela>
  )
}
