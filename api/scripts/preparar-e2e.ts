// Prepara o banco dos testes de ponta a ponta (Playwright): apaga tudo, aplica as migrations e roda o seed.
// Por segurança, só aceita bancos cujo nome termina em "_e2e".
import { execSync } from 'node:child_process'
import pg from 'pg'

try {
  process.loadEnvFile()
} catch {
  // no CI as variáveis vêm do ambiente
}

const url = new URL(process.env.DATABASE_URL ?? '')
const nomeBanco = url.pathname.slice(1)
if (!nomeBanco.endsWith('_e2e')) {
  console.error(
    `Recusado: o banco "${nomeBanco}" não é de testes de ponta a ponta (deve terminar em _e2e).`,
  )
  process.exit(1)
}

const admin = new URL(url)
admin.pathname = '/postgres'
admin.search = ''
const cliente = new pg.Client({ connectionString: admin.toString() })
await cliente.connect()
try {
  await cliente.query(`DROP DATABASE IF EXISTS "${nomeBanco}" WITH (FORCE)`)
  await cliente.query(`CREATE DATABASE "${nomeBanco}"`)
} finally {
  await cliente.end()
}

const opcoes = { env: process.env, stdio: 'inherit' as const }
execSync('npx prisma migrate deploy', opcoes)
execSync('npx tsx prisma/seed.ts', opcoes)

// O treinador dos testes já começa com o termo aceito (o fluxo do termo é testado com o aluno novo)
const banco = new pg.Client({ connectionString: url.toString().replace(/\?.*$/, '') })
await banco.connect()
await banco.query(`UPDATE usuarios SET consentimento_em = now() WHERE perfil = 'TREINADOR'`)
await banco.end()
console.log(`Banco ${nomeBanco} pronto para os testes de ponta a ponta.`)
