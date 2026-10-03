function obrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida (veja api/.env.example)`)
  return valor
}

export const env = {
  get databaseUrl() {
    return obrigatoria('DATABASE_URL')
  },
  port: Number(process.env.PORT ?? 3333),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
}
