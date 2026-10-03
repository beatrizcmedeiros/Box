import { criarApp } from './app.ts'
import { env } from './env.ts'
import { bancoDisponivel, prisma } from './lib/prisma.ts'

const app = criarApp({ verificarBanco: bancoDisponivel, webOrigin: env.webOrigin })

const server = app.listen(env.port, () => {
  console.log(`API do PR Box em http://localhost:${env.port}`)
})

async function encerrar() {
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', encerrar)
process.on('SIGTERM', encerrar)
