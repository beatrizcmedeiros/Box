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

export type Turma = { id: number; nome: string; horario: string | null; totalAlunos: number }

export type CategoriaExercicio = 'LEVANTAMENTO' | 'OLIMPICO' | 'OUTRO'

export const CATEGORIAS: Record<CategoriaExercicio, string> = {
  LEVANTAMENTO: 'Levantamento',
  OLIMPICO: 'Olímpico',
  OUTRO: 'Outro',
}

export type Exercicio = {
  id: number
  nome: string
  categoria: CategoriaExercicio
  ativo: boolean
  aliases: string[]
}

export type Aluno = {
  id: number
  nome: string
  email: string
  ativo: boolean
  trocarSenha: boolean
  consentimentoEm: string | null
  criadoEm: string
  turma: TurmaResumo | null
}

export type ExercicioResumo = { id: number; nome: string; categoria: CategoriaExercicio }

export type Lancamento = {
  id: number
  dataTeste: string
  cargaKg: number
  origem: 'ALUNO' | 'IMPORTACAO'
}

export type CargaPercentual = { percentual: number; cargaKg: number }

export type ResumoPr = {
  exercicio: ExercicioResumo
  pr: Lancamento
  percentuais: CargaPercentual[]
  novoRecorde: boolean
  diferencaKg: number | null
}

export type DetalhePr = ResumoPr & { historico: Lancamento[] }
