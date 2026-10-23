// Tipos das respostas da API usadas pelo app (espelham web/src/lib/tipos.ts)

/** PESSOA: aluno e, se ehProfessor, também professor. ACADEMIA: conta do dono do box. */
export type TipoConta = 'PESSOA' | 'ACADEMIA'

export type TurmaResumo = { id: number; nome: string }

export type Usuario = {
  id: number
  nome: string
  email: string
  tipo: TipoConta
  ehProfessor: boolean
  /** Preenchido na conta da academia */
  academia: TurmaResumo | null
  consentimentoPendente: boolean
}

/** Onde o professor ou a academia trabalha: uma academia ou "Meus alunos" (pessoal). */
export type Contexto = { id: string; tipo: 'academia' | 'professor'; nome: string }

/** Agrupamento do professor (ex.: o nome de outra academia onde ele dá aula). */
export type Local = TurmaResumo

export type CodigoVinculo = { codigo: string; expiraEm: string | null; criadoEm: string }

export type Validade = '15' | '30' | 'nunca'

export type Vinculos = {
  comoAluno: {
    id: number
    tipo: 'academia' | 'professor'
    academia: TurmaResumo | null
    professor: TurmaResumo | null
    turma: TurmaResumo | null
    desde: string
  }[]
  academiasOndeEnsina: (TurmaResumo & { desde: string })[]
}

export type CategoriaExercicio = 'LEVANTAMENTO' | 'OLIMPICO' | 'OUTRO'

export type ExercicioResumo = { id: number; nome: string; categoria: CategoriaExercicio }

/** Exercício para o aluno registrar PR. origem: null (padrão), "pessoal" ou o nome da academia/professor */
export type ExercicioDoAluno = ExercicioResumo & { origem: string | null; pessoal: boolean }

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

// ---- Área do treinador (espelha web/src/lib/tipos.ts) ----

export type Turma = {
  id: number
  nome: string
  horario: string | null
  totalAlunos: number
  /** Local do professor (só no contexto "Meus alunos") */
  local: TurmaResumo | null
}

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
  escopo: 'PADRAO' | 'ACADEMIA' | 'PROFESSOR' | 'PESSOAL'
  /** false na lista padrão: só os nomes alternativos podem ser acrescentados */
  editavel: boolean
}

/** Aluno vinculado ao contexto, com a organização deste vínculo (turma, local, apelidos). */
export type Aluno = {
  id: number
  nome: string
  email: string
  vinculoId: number
  turma: TurmaResumo | null
  local: TurmaResumo | null
  apelidos: string[]
  desde: string
  primeiroAcessoPendente: boolean
}

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

export type LinhaPercentuais = {
  aluno: { id: number; nome: string }
  turma: TurmaResumo | null
  exercicio: { id: number; nome: string }
  dataTeste: string
  prKg: number
  cargas: CargaPercentual[]
}

export type ConsultaPercentuais = {
  percentuais: number[]
  resultados: LinhaPercentuais[]
  totais: { alunos: number; registros: number }
  limitado: boolean
}
