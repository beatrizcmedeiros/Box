// Extrai o texto do PDF NO NAVEGADOR do treinador — o arquivo não é enviado ao servidor.
// 1) Se o PDF tem texto (gerado por editor/planilha), usa o texto.
// 2) Se é imagem (ex.: nota do celular exportada em PDF), aplica OCR (tesseract.js, português).
//
// Este módulo é carregado sob demanda (import dinâmico), só na tela de importação.

import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
// "?url" é resolvido pelo Vite (devolve o endereço do arquivo do worker)
// oxlint-disable-next-line import/default
import workerPdf from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { createWorker } from 'tesseract.js'

GlobalWorkerOptions.workerSrc = workerPdf

export type ProgressoExtracao = { etapa: string; percentual: number }

export type TextoExtraido = { texto: string; usouOcr: boolean; paginas: number }

// Menos que isso por página indica PDF de imagem (só cabeçalho/rodapé ou nada)
const MINIMO_CARACTERES_POR_PAGINA = 20

export async function extrairTextoPdf(
  arquivo: File,
  aoProgredir: (p: ProgressoExtracao) => void,
): Promise<TextoExtraido> {
  aoProgredir({ etapa: 'Abrindo o PDF…', percentual: 0 })
  const carregamento = getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
  const pdf = await carregamento.promise

  try {
    const texto = await lerCamadaDeTexto(pdf)
    if (texto.replace(/\s/g, '').length >= MINIMO_CARACTERES_POR_PAGINA * pdf.numPages) {
      return { texto, usouOcr: false, paginas: pdf.numPages }
    }
    return { texto: await reconhecerTexto(pdf, aoProgredir), usouOcr: true, paginas: pdf.numPages }
  } finally {
    await carregamento.destroy()
  }
}

async function lerCamadaDeTexto(pdf: PDFDocumentProxy): Promise<string> {
  const paginas: string[] = []
  for (let n = 1; n <= pdf.numPages; n++) {
    const conteudo = await (await pdf.getPage(n)).getTextContent()
    let texto = ''
    for (const item of conteudo.items) {
      if (!('str' in item)) continue
      texto += item.str + (item.hasEOL ? '\n' : '')
    }
    paginas.push(texto)
  }
  return paginas.join('\n')
}

async function reconhecerTexto(
  pdf: PDFDocumentProxy,
  aoProgredir: (p: ProgressoExtracao) => void,
): Promise<string> {
  aoProgredir({
    etapa: 'Preparando a leitura da imagem (primeira vez pode demorar)…',
    percentual: 5,
  })

  let paginaAtual = 1
  const worker = await createWorker('por', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const base = (paginaAtual - 1) / pdf.numPages
        aoProgredir({
          etapa: `Lendo a página ${paginaAtual} de ${pdf.numPages}…`,
          percentual: Math.round(10 + 90 * (base + m.progress / pdf.numPages)),
        })
      }
    },
  })

  try {
    const paginas: string[] = []
    for (; paginaAtual <= pdf.numPages; paginaAtual++) {
      const pagina = await pdf.getPage(paginaAtual)
      // Escala 2,5 ≈ 180 dpi: suficiente para o OCR sem pesar na memória do celular
      const viewport = pagina.getViewport({ scale: 2.5 })
      const canvas = document.createElement('canvas')
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      await pagina.render({ canvas, viewport }).promise
      const { data } = await worker.recognize(canvas)
      paginas.push(data.text)
      canvas.width = canvas.height = 0
    }
    return paginas.join('\n')
  } finally {
    await worker.terminate()
  }
}
