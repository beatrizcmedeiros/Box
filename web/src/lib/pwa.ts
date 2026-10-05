import { CACHE_DADOS_ALUNO } from './pwaConstantes.ts'

/** Apaga os dados do aluno guardados para uso offline — importante em aparelhos compartilhados. */
export async function limparDadosOffline() {
  if (typeof caches === 'undefined') return
  try {
    await caches.delete(CACHE_DADOS_ALUNO)
  } catch {
    // sem acesso ao cache (navegador antigo ou modo privado): nada a limpar
  }
}
