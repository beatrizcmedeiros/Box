// Leitura da lista de resultados do teste de força escrita pelo treinador.
//
// Formato real observado (nota do celular exportada em PDF):
//
//   Teste agachamento        ← título: define o exercício das linhas seguintes
//   Ana 55kg                 ← nome (ou apelido) + carga, com ou sem "kg"
//   Lurdinha 85
//   Lucas 110 kg
//
// O texto pode vir do OCR, que às vezes troca "kg" por "Kkg"/"kq" ou "0" por "O".

export const CARGA_MINIMA_KG = 1
export const CARGA_MAXIMA_KG = 500

export type LinhaLida = {
  /** Número da linha no texto original (1 = primeira), para o treinador localizar. */
  numero: number
  texto: string
  nome: string | null
  cargaKg: number | null
  /** Motivo quando a linha parece um resultado mas não pôde ser lida. */
  problema: string | null
}

export type SecaoLida = {
  /** Título como escrito (ex.: "Teste agachamento"); null se a lista não tem título. */
  titulo: string | null
  linhas: LinhaLida[]
}

// Unidade no fim da linha, incluindo variações comuns de OCR: "kg", "Kkg", "kq", "k9", "kgs", "quilos"
const UNIDADE = /\s*(?:k+\s*[gq9]+s?|quilos?|kilos?)\.?\s*$/i

// "11O" → "110": letra O colada a dígitos é quase sempre zero lido errado
const corrigirZeros = (texto: string) => texto.replace(/(?<=\d)[oO]|[oO](?=\d)/g, '0')

const RESULTADO = /^(?<nome>.*\p{L}.*?)[\s:=\-–—]+(?<carga>\d{1,4}(?:[.,]\d{1,2})?)$/u

export function lerTexto(texto: string): SecaoLida[] {
  const secoes: SecaoLida[] = []
  let atual: SecaoLida | null = null

  texto.split(/\r?\n/).forEach((original, indice) => {
    const linha = original.replace(/\s+/g, ' ').trim()
    if (!linha) return

    const temDigito = /\d/.test(linha)
    const temLetra = /\p{L}/u.test(linha)

    // Linha só com texto: título de uma nova seção (exercício)
    if (!temDigito && temLetra) {
      atual = { titulo: linha, linhas: [] }
      secoes.push(atual)
      return
    }

    if (!atual) {
      atual = { titulo: null, linhas: [] }
      secoes.push(atual)
    }
    atual.linhas.push(lerLinha(linha, indice + 1))
  })

  return secoes.filter((s) => s.linhas.length > 0)
}

function lerLinha(texto: string, numero: number): LinhaLida {
  const semUnidade = corrigirZeros(texto).replace(UNIDADE, '')
  const encontrado = RESULTADO.exec(semUnidade)

  if (!encontrado?.groups) {
    return {
      numero,
      texto,
      nome: null,
      cargaKg: null,
      problema: 'Não foi possível separar nome e carga',
    }
  }

  const nome = encontrado.groups.nome.replace(/[\s:=\-–—]+$/, '').trim()
  const cargaKg = Number(encontrado.groups.carga.replace(',', '.'))

  if (cargaKg < CARGA_MINIMA_KG || cargaKg > CARGA_MAXIMA_KG) {
    return {
      numero,
      texto,
      nome,
      cargaKg,
      problema: `Carga fora do intervalo (${CARGA_MINIMA_KG} a ${CARGA_MAXIMA_KG} kg)`,
    }
  }
  return { numero, texto, nome, cargaKg, problema: null }
}
