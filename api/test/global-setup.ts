import { execSync } from 'node:child_process'
import pg from 'pg'
import { urlBancoTeste } from './url-banco-teste.ts'

/** Cria o banco de testes (se não existir) e aplica as migrations antes da suíte. */
export default async function () {
  const url = new URL(urlBancoTeste())
  const nomeBanco = url.pathname.slice(1)

  const admin = new URL(url)
  admin.pathname = '/postgres'
  admin.search = ''
  const cliente = new pg.Client({ connectionString: admin.toString() })
  await cliente.connect()
  try {
    const existe = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nomeBanco])
    if (existe.rowCount === 0) await cliente.query(`CREATE DATABASE "${nomeBanco}"`)
  } finally {
    await cliente.end()
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url.toString() },
    stdio: 'pipe',
  })
}
