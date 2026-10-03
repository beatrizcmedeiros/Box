// Cria uma conta de treinador com senha temporária (troca obrigatória no primeiro acesso).
// Uso: npm run criar-treinador -w api -- "Nome do Treinador" email@dominio.com
import { PrismaPg } from '@prisma/adapter-pg'
import { z } from 'zod'
import { PrismaClient } from '../src/generated/prisma/client.ts'
import { gerarHashSenha, gerarSenhaTemporaria } from '../src/lib/senha.ts'

try {
  process.loadEnvFile()
} catch {
  // sem .env: usa as variáveis do ambiente
}

const argumentos = z
  .tuple([
    z.string().trim().min(2, 'Informe o nome entre aspas'),
    z.string().trim().toLowerCase().pipe(z.email('E-mail inválido')),
  ])
  .safeParse(process.argv.slice(2))

if (!argumentos.success) {
  console.error('Uso: npm run criar-treinador -w api -- "Nome do Treinador" email@dominio.com')
  console.error(argumentos.error.issues.map((i) => `- ${i.message}`).join('\n'))
  process.exit(1)
}

const [nome, email] = argumentos.data
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
})

try {
  if (await prisma.usuario.findUnique({ where: { email } })) {
    console.error(`Já existe um usuário com o e-mail ${email}.`)
    process.exitCode = 1
  } else {
    const senhaTemporaria = gerarSenhaTemporaria()
    await prisma.usuario.create({
      data: {
        nome,
        email,
        perfil: 'TREINADOR',
        senhaHash: await gerarHashSenha(senhaTemporaria),
        trocarSenha: true,
      },
    })
    console.log(`Treinador criado: ${nome} <${email}>`)
    console.log(`Senha temporária: ${senhaTemporaria}`)
    console.log('Repasse a senha com segurança; ela deverá ser trocada no primeiro acesso.')
  }
} finally {
  await prisma.$disconnect()
}
