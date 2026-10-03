/** URL do banco de testes: mesmo servidor do DATABASE_URL, com o sufixo "_test" no nome. */
export function urlBancoTeste(): string {
  try {
    process.loadEnvFile()
  } catch {
    // no CI o DATABASE_URL vem do ambiente
  }
  const base = process.env.DATABASE_URL
  if (!base) throw new Error('DATABASE_URL não definida (veja api/.env.example)')

  const url = new URL(base)
  if (!url.pathname.endsWith('_test')) url.pathname = `${url.pathname}_test`
  return url.toString()
}
