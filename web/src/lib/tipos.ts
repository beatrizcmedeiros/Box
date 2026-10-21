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
  apelidos: string[]
}

/** ALUNO = registrado pelo aluno; IMPORTACAO = lista (PDF) do treinador; TREINADOR = lançado na tela Teste de carga */
export type OrigemTeste = 'ALUNO' | 'IMPORTACAO' | 'TREINADOR'

export type ExercicioResumo = { id: number; nome: string; categoria: CategoriaExercicio }

export type Lancamento = {
  id: number
  dataTeste: string
  cargaKg: number
  origem: OrigemTeste
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

// Importação da lista do treinador (Fase 4)

export type AlunoAssociado = { id: number; nome: string }

export type ResultadoAluno =
  | { status: 'encontrado'; aluno: AlunoAssociado; por: 'apelido' | 'nome' | 'primeiro_nome' }
  | { status: 'sugestao'; aluno: AlunoAssociado; candidatos: AlunoAssociado[]; motivo: string }
  | { status: 'nao_encontrado'; candidatos: AlunoAssociado[] }

export type ResultadoExercicio =
  | { status: 'encontrado'; exercicioId: number }
  | { status: 'ambiguo'; candidatos: number[] }
  | { status: 'nao_encontrado' }

export type LinhaPrevia = {
  numero: number
  texto: string
  nome: string | null
  cargaKg: number | null
  problema: string | null
  aluno: ResultadoAluno | null
  duplicado: boolean
}

export type SecaoPrevia = {
  titulo: string | null
  tituloLimpo: string
  exercicio: ResultadoExercicio
  linhas: LinhaPrevia[]
}

export type Previa = {
  secoes: SecaoPrevia[]
  resumo: {
    linhas: number
    encontrados: number
    sugestoes: number
    naoEncontrados: number
    comProblema: number
  }
  alunos: { id: number; nome: string; turma: string | null }[]
  exercicios: { id: number; nome: string }[]
}

export type Importacao = {
  id: number
  dataTeste: string
  nomeArquivo: string
  status: 'PREVIA' | 'CONFIRMADA' | 'CANCELADA'
  totalLinhas: number
  resultadosAtuais: number
  turma: TurmaResumo | null
  treinador: string
  criadoEm: string
}

// Consulta de cargas (Fase 5)

export type OrdenacaoCargas = 'carga' | 'aluno' | 'data' | 'variacao'

export type ResultadoCarga = {
  aluno: { id: number; nome: string }
  turma: TurmaResumo | null
  exercicio: { id: number; nome: string }
  dataTeste: string
  cargaKg: number
  origem: OrigemTeste
  variacaoKg: number | null
}

export type ConsultaCargas = {
  resultados: ResultadoCarga[]
  totais: { registros: number; alunos: number; maiorCargaKg: number | null; mediaKg: number | null }
  pagina: number
  porPagina: number
  totalPaginas: number
}

export type VisaoGeral = {
  alunos: {
    ativos: number
    primeiroAcessoConcluido: number
    comPr: number
    percentualComPr: number
  }
  ultimos30Dias: { registradosPeloAluno: number; importados: number }
  ultimaImportacao: { dataTeste: string; criadoEm: string; resultados: number } | null
  alunosSemPr: {
    id: number
    nome: string
    turma: string | null
    aguardandoPrimeiroAcesso: boolean
  }[]
}

// Evolução (dashboards do aluno e do treinador)

export type SerieExercicio = {
  exercicio: ExercicioResumo
  pontos: { data: string; cargaKg: number }[]
  primeiroKg: number
  atualKg: number
  melhorKg: number
  variacaoKg: number
  variacaoPct: number | null
}

export type Ciclo = { chave: string; rotulo: string; semana: string }

export type EvolucaoTurmas = {
  exercicios: { id: number; nome: string }[]
  exercicio: { id: number; nome: string } | null
  ciclos: Ciclo[]
  turmas: {
    turma: TurmaResumo | null
    porCiclo: { ciclo: string; mediaKg: number | null; alunos: number }[]
  }[]
  alunos: {
    aluno: { id: number; nome: string }
    turma: TurmaResumo | null
    porCiclo: Record<string, number>
    ultimoCiclo: string | null
    ultimoKg: number | null
    anteriorKg: number | null
    variacaoKg: number | null
    variacaoPct: number | null
  }[]
  resumo: {
    cicloAtual: string
    cicloAnterior: string | null
    alunosAvaliados: number
    mediaAtualKg: number | null
    medianaAtualKg: number | null
    mediaAnteriorKg: number | null
    evolucaoMediaKg: number | null
    evolucaoMediaPct: number | null
    comparaveis: number
    evoluiram: number
    mantiveram: number
    cairam: number
  } | null
}

// Teste de carga (lançamento pelo treinador)

export type AlunoParaLancar = {
  aluno: { id: number; nome: string }
  turma: TurmaResumo | null
  prAtual: { cargaKg: number; dataTeste: string } | null
  melhorAnteriorKg: number | null
  lancamento: { id: number; cargaKg: number; origem: OrigemTeste } | null
}

export type ResultadoLancamento = {
  criados: number
  atualizados: number
  novosRecordes: { usuarioId: number; nome: string; cargaKg: number; anteriorKg: number }[]
}
