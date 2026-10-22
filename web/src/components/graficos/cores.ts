// Cores dos gráficos (validadas com o validador de paleta da skill de visualização de dados,
// sobre a superfície branca dos cartões).

/** Série única (evolução do aluno): laranja forte da marca — contraste 4,7:1 sobre branco. */
export const COR_DESTAQUE = '#c84b0c'

/** De-ênfase (teste anterior no gráfico de halteres): cinza com 3:1 sobre branco. */
export const COR_SECUNDARIA = '#7c8ba0'

/**
 * Paleta categórica (uma cor por turma), em ordem fixa — nunca reciclada.
 * Verde-água e amarelo ficam abaixo de 3:1 sobre branco: por isso os gráficos sempre
 * trazem legenda, rótulo no fim da linha e a opção de tabela.
 */
export const CORES_CATEGORICAS = [
  '#2a78d6', // azul
  '#eb6834', // laranja
  '#1baf7a', // verde-água
  '#eda100', // amarelo
  '#e87ba4', // magenta
  '#008300', // verde
  '#6250d6', // violeta
  '#e34948', // vermelho
]

/** Além da 8ª entidade, agrupa em cinza (não se geram novas cores). */
export const COR_OUTROS = '#898781'

export const corCategorica = (indice: number) =>
  indice >= 0 && indice < CORES_CATEGORICAS.length ? CORES_CATEGORICAS[indice] : COR_OUTROS

// Tinta do gráfico (texto nunca usa a cor da série)
export const TINTA = {
  primaria: '#1e293b',
  secundaria: '#5a6b84',
  grade: '#e7e9ee',
  eixo: '#c3c8d1',
}
