-- CreateEnum
CREATE TYPE "Perfil" AS ENUM ('ALUNO', 'TREINADOR');

-- CreateEnum
CREATE TYPE "CategoriaExercicio" AS ENUM ('LEVANTAMENTO', 'OLIMPICO', 'OUTRO');

-- CreateEnum
CREATE TYPE "OrigemTeste" AS ENUM ('ALUNO', 'IMPORTACAO');

-- CreateEnum
CREATE TYPE "StatusImportacao" AS ENUM ('PREVIA', 'CONFIRMADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "perfil" "Perfil" NOT NULL DEFAULT 'ALUNO',
    "turma_id" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "consentimento_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turmas" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "horario" TEXT,

    CONSTRAINT "turmas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercicios" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "CategoriaExercicio" NOT NULL DEFAULT 'OUTRO',
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "exercicios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercicio_alias" (
    "id" SERIAL NOT NULL,
    "exercicio_id" INTEGER NOT NULL,
    "alias" TEXT NOT NULL,

    CONSTRAINT "exercicio_alias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testes_carga" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "exercicio_id" INTEGER NOT NULL,
    "data_teste" DATE NOT NULL,
    "carga_kg" DECIMAL(6,2) NOT NULL,
    "origem" "OrigemTeste" NOT NULL DEFAULT 'ALUNO',
    "importacao_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testes_carga_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "importacoes" (
    "id" SERIAL NOT NULL,
    "treinador_id" INTEGER NOT NULL,
    "turma_id" INTEGER,
    "data_teste" DATE NOT NULL,
    "nome_arquivo" TEXT NOT NULL,
    "status" "StatusImportacao" NOT NULL DEFAULT 'PREVIA',
    "total_linhas" INTEGER NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "importacoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_turma_id_idx" ON "usuarios"("turma_id");

-- CreateIndex
CREATE UNIQUE INDEX "turmas_nome_key" ON "turmas"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "exercicios_nome_key" ON "exercicios"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "exercicio_alias_alias_key" ON "exercicio_alias"("alias");

-- CreateIndex
CREATE INDEX "testes_carga_usuario_id_exercicio_id_data_teste_idx" ON "testes_carga"("usuario_id", "exercicio_id", "data_teste" DESC);

-- CreateIndex
CREATE INDEX "testes_carga_exercicio_id_idx" ON "testes_carga"("exercicio_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_alias" ADD CONSTRAINT "exercicio_alias_exercicio_id_fkey" FOREIGN KEY ("exercicio_id") REFERENCES "exercicios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testes_carga" ADD CONSTRAINT "testes_carga_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testes_carga" ADD CONSTRAINT "testes_carga_exercicio_id_fkey" FOREIGN KEY ("exercicio_id") REFERENCES "exercicios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testes_carga" ADD CONSTRAINT "testes_carga_importacao_id_fkey" FOREIGN KEY ("importacao_id") REFERENCES "importacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_treinador_id_fkey" FOREIGN KEY ("treinador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
