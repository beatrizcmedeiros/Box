function obrigatoria(nome: string): string {
  const valor = process.env[nome]
  if (!valor) throw new Error(`Variável de ambiente ${nome} não definida (veja api/.env.example)`)
  return valor
}

export const env = {
  get databaseUrl() {
    return obrigatoria('DATABASE_URL')
  },
  get jwtSecret() {
    const segredo = obrigatoria('JWT_SECRET')
    if (segredo.length < 32) throw new Error('JWT_SECRET precisa ter pelo menos 32 caracteres')
    return segredo
  },
  get producao() {
    return process.env.NODE_ENV === 'production'
  },
  port: Number(process.env.PORT ?? 3333),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
}
