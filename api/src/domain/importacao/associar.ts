// Associa os nomes lidos na lista aos alunos cadastrados e o título da seção a um exercício.
// Sugestões por semelhança NUNCA são aplicadas automaticamente: o treinador confirma.

import { normalizarTexto } from '../../lib/texto.ts'

export type AlunoParaAssociar = {
  id: number
  nome: string
  turmaId: number | null
  apelidos: string[]
}

export type ExercicioParaAssociar = { id: number; nome: string; aliases: string[] }

export type AlunoAssociado = { id: number; nome: string }

export type ResultadoAluno =
  | { status: 'encontrado'; aluno: AlunoAssociado; por: 'apelido' | 'nome' | 'primeiro_nome' }
  | { status: 'sugestao'; aluno: AlunoAssociado; candidatos: AlunoAssociado[]; motivo: string }
  | { status: 'nao_encontrado'; candidatos: AlunoAssociado[] }

const SEMELHANCA_MINIMA = 0.75

/** Semelhança entre 0 e 1 (1 = iguais), baseada na distância de Levenshtein. */
export function semelhanca(a: string, b: string): number {
  if (a === b) return 1
  if (!a.length || !b.length) return 0
  let anterior = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const atual = [i]
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      atual[j] = Math.min(anterior[j] + 1, atual[j - 1] + 1, anterior[j - 1] + custo)
    }
    anterior = atual
  }
  return 1 - anterior[b.length] / Math.max(a.length, b.length)
}

const resumo = (a: AlunoParaAssociar): AlunoAssociado => ({ id: a.id, nome: a.nome })

/** "maria fernanda" é prefixo (por palavras) de "maria fernanda souza". */
const ehPrefixoDoNome = (lido: string, nomeCompleto: string) => {
  const p = lido.split(' ')
  const n = nomeCompleto.split(' ')
  return p.length <= n.length && p.every((parte, i) => parte === n[i])
}

/**
 * @param turmaId turma informada na importação: em caso de ambiguidade (duas "Ana"),
 * os alunos dessa turma têm preferência.
 */
export function associarAluno(
  nomeLido: string,
  alunos: AlunoParaAssociar[],
  turmaId: number | null,
): ResultadoAluno {
  const lido = normalizarTexto(nomeLido)
  const preferir = (lista: AlunoParaAssociar[]) => {
    const daTurma = turmaId ? lista.filter((a) => a.turmaId === turmaId) : []
    return daTurma.length > 0 ? daTurma : lista
  }

  // 1) Apelido já conhecido (sempre único no banco)
  const porApelido = alunos.find((a) => a.apelidos.includes(lido))
  if (porApelido) return { status: 'encontrado', aluno: resumo(porApelido), por: 'apelido' }

  // 2) Nome completo igual
  const porNome = preferir(alunos.filter((a) => normalizarTexto(a.nome) === lido))
  if (porNome.length === 1) return { status: 'encontrado', aluno: resumo(porNome[0]), por: 'nome' }

  // 3) Primeiro(s) nome(s): "Ana" → "Ana Souza", se não houver outra "Ana"
  const porPrefixo = preferir(alunos.filter((a) => ehPrefixoDoNome(lido, normalizarTexto(a.nome))))
  if (porPrefixo.length === 1) {
    return { status: 'encontrado', aluno: resumo(porPrefixo[0]), por: 'primeiro_nome' }
  }
  if (porPrefixo.length > 1) {
    return {
      status: 'sugestao',
      aluno: resumo(porPrefixo[0]),
      candidatos: porPrefixo.map(resumo),
      motivo: `Há ${porPrefixo.length} alunos com esse nome`,
    }
  }

  // 4) Semelhança (erros de digitação/OCR, apelidos parecidos com o nome)
  const pontuados = alunos
    .map((a) => {
      const nome = normalizarTexto(a.nome)
      const partes = nome.split(' ')
      const comparaveis = [nome, partes.slice(0, lido.split(' ').length).join(' '), ...a.apelidos]
      return { aluno: a, nota: Math.max(...comparaveis.map((c) => semelhanca(lido, c))) }
    })
    .filter((p) => p.nota >= SEMELHANCA_MINIMA)
    .sort((x, y) => y.nota - x.nota || x.aluno.nome.localeCompare(y.aluno.nome))
    .slice(0, 3)

  if (pontuados.length > 0) {
    return {
      status: 'sugestao',
      aluno: resumo(pontuados[0].aluno),
      candidatos: pontuados.map((p) => resumo(p.aluno)),
      motivo: 'Nome parecido — confirme se é o mesmo aluno',
    }
  }
  return { status: 'nao_encontrado', candidatos: [] }
}

// Palavras que costumam aparecer no título mas não fazem parte do nome do exercício
const PALAVRAS_DO_TITULO = new Set([
  'teste',
  'testes',
  'de',
  'do',
  'da',
  'no',
  'na',
  'pr',
  'prs',
  'rm',
  '1rm',
  'carga',
  'cargas',
  'maxima',
  'maximo',
  'forca',
  'resultado',
  'resultados',
  'dia',
  'semestre',
])

/** "Teste de agachamento - março" → "agachamento março"; remove palavras genéricas e números. */
export function limparTitulo(titulo: string): string {
  return normalizarTexto(titulo)
    .replace(/[^\p{L}\d& ]/gu, ' ')
    .split(' ')
    .filter((p) => p && !PALAVRAS_DO_TITULO.has(p) && !/\d/.test(p))
    .join(' ')
}

export type ResultadoExercicio =
  | { status: 'encontrado'; exercicioId: number }
  | { status: 'ambiguo'; candidatos: number[] }
  | { status: 'nao_encontrado' }

export function associarExercicio(
  titulo: string | null,
  exercicios: ExercicioParaAssociar[],
): ResultadoExercicio {
  if (!titulo) return { status: 'nao_encontrado' }
  const limpo = limparTitulo(titulo)
  if (!limpo) return { status: 'nao_encontrado' }

  const nomesDe = (e: ExercicioParaAssociar) => [normalizarTexto(e.nome), ...e.aliases]

  const exatos = exercicios.filter((e) => nomesDe(e).includes(limpo))
  if (exatos.length === 1) return { status: 'encontrado', exercicioId: exatos[0].id }

  // Título contém o nome ("teste back squat março") ou é parte dele ("agachamento" ⊂ "agachamento livre")
  const contem = (a: string, b: string) => ` ${a} `.includes(` ${b} `)
  const parciais = exercicios.filter((e) =>
    nomesDe(e).some((nome) => contem(limpo, nome) || contem(nome, limpo)),
  )
  if (parciais.length === 1) return { status: 'encontrado', exercicioId: parciais[0].id }
  if (parciais.length > 1) return { status: 'ambiguo', candidatos: parciais.map((e) => e.id) }
  return { status: 'nao_encontrado' }
}
