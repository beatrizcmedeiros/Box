// Tipos das respostas da API usadas pelo app (espelham web/src/lib/tipos.ts)

export type Perfil = 'ALUNO' | 'TREINADOR'

export type TurmaResumo = { id: number; nome: string }

export type Usuario = {
  id: number
  nome: string
  email: string
  perfil: Perfil
  turma: TurmaResumo | null
  trocarSenha: boolean
  consentimentoPendente: boolean
}

export type CategoriaExercicio = 'LEVANTAMENTO' | 'OLIMPICO' | 'OUTRO'

export type ExercicioResumo = { id: number; nome: string; categoria: CategoriaExercicio }

/** ALUNO = registrado pelo aluno; IMPORTACAO e TREINADOR = lançados pelo treinador */
export type OrigemTeste = 'ALUNO' | 'IMPORTACAO' | 'TREINADOR'

export type Lancamento = { id: number; dataTeste: string; cargaKg: number; origem: OrigemTeste }

export type CargaPercentual = { percentual: number; cargaKg: number }

export type ResumoPr = {
  exercicio: ExercicioResumo
  pr: Lancamento
  percentuais: CargaPercentual[]
  novoRecorde: boolean
  diferencaKg: number | null
}

export type DetalhePr = ResumoPr & { historico: Lancamento[] }

export type SerieExercicio = {
  exercicio: ExercicioResumo
  pontos: { data: string; cargaKg: number }[]
  primeiroKg: number
  atualKg: number
  melhorKg: number
  variacaoKg: number
  variacaoPct: number | null
}

/** Tokens que a API entrega ao app (cabeçalho X-Prbox-Cliente: app). */
export type Tokens = { acesso: string; refresh: string; acessoExpiraEm: string }

export type RespostaSessao = { usuario: Usuario; tokens: Tokens }
