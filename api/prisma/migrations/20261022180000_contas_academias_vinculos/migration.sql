-- Contas abertas, academias e vínculos (docs/plano-vinculos.md).
-- Conversão dos dados existentes:
--   * treinadores (perfil TREINADOR) viram professores (eh_professor = true);
--   * turmas antigas não têm dono (academia ou local do professor) e são removidas;
--   * apelidos globais deixam de existir: agora valem dentro de cada vínculo;
--   * exercícios existentes passam a ser da lista padrão.

-- CreateEnum
CREATE TYPE "TipoConta" AS ENUM ('PESSOA', 'ACADEMIA');

-- CreateEnum
CREATE TYPE "EscopoExercicio" AS ENUM ('PADRAO', 'ACADEMIA', 'PROFESSOR', 'PESSOAL');

-- CreateEnum
CREATE TYPE "TipoCodigo" AS ENUM ('ALUNOS_ACADEMIA', 'PROFESSORES_ACADEMIA', 'ALUNOS_PROFESSOR');

-- DropForeignKey
ALTER TABLE "aluno_apelido" DROP CONSTRAINT "aluno_apelido_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "importacoes" DROP CONSTRAINT "importacoes_treinador_id_fkey";

-- DropForeignKey
ALTER TABLE "usuarios" DROP CONSTRAINT "usuarios_turma_id_fkey";

-- DropIndex
DROP INDEX "exercicio_alias_alias_key";

-- DropIndex
DROP INDEX "exercicios_nome_key";

-- DropIndex
DROP INDEX "turmas_nome_key";

-- DropIndex
DROP INDEX "usuarios_turma_id_idx";

-- AlterTable
ALTER TABLE "exercicio_alias" ADD COLUMN     "academia_id" INTEGER,
ADD COLUMN     "professor_id" INTEGER;

-- AlterTable
ALTER TABLE "exercicios" ADD COLUMN     "academia_id" INTEGER,
ADD COLUMN     "dono_id" INTEGER,
ADD COLUMN     "escopo" "EscopoExercicio" NOT NULL DEFAULT 'PADRAO';

-- AlterTable
ALTER TABLE "importacoes" ADD COLUMN     "academia_id" INTEGER,
ADD COLUMN     "professor_id" INTEGER;

-- AlterTable
ALTER TABLE "testes_carga" ADD COLUMN     "academia_id" INTEGER,
ADD COLUMN     "lancado_por_id" INTEGER;

-- AlterTable
ALTER TABLE "turmas" ADD COLUMN     "academia_id" INTEGER,
ADD COLUMN     "local_id" INTEGER;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "eh_professor" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "tipo" "TipoConta" NOT NULL DEFAULT 'PESSOA';

-- Treinadores atuais viram professores
UPDATE "usuarios" SET "eh_professor" = true WHERE "perfil" = 'TREINADOR';

ALTER TABLE "usuarios" DROP COLUMN "perfil",
DROP COLUMN "turma_id";

-- Turmas antigas não têm dono no modelo novo (importações ficam sem turma)
DELETE FROM "turmas";

-- DropTable
DROP TABLE "aluno_apelido";

-- DropEnum
DROP TYPE "Perfil";

-- CreateTable
CREATE TABLE "academias" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "conta_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "academias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professores_academia" (
    "id" SERIAL NOT NULL,
    "academia_id" INTEGER NOT NULL,
    "professor_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professores_academia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locais_professor" (
    "id" SERIAL NOT NULL,
    "professor_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "locais_professor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vinculos_aluno" (
    "id" SERIAL NOT NULL,
    "aluno_id" INTEGER NOT NULL,
    "academia_id" INTEGER,
    "professor_id" INTEGER,
    "turma_id" INTEGER,
    "local_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vinculos_aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apelidos_vinculo" (
    "id" SERIAL NOT NULL,
    "vinculo_id" INTEGER NOT NULL,
    "apelido" TEXT NOT NULL,

    CONSTRAINT "apelidos_vinculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codigos_vinculo" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "TipoCodigo" NOT NULL,
    "academia_id" INTEGER,
    "professor_id" INTEGER,
    "expira_em" TIMESTAMP(3),
    "revogado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_vinculo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "academias_conta_id_key" ON "academias"("conta_id");

-- CreateIndex
CREATE INDEX "professores_academia_professor_id_idx" ON "professores_academia"("professor_id");

-- CreateIndex
CREATE UNIQUE INDEX "professores_academia_academia_id_professor_id_key" ON "professores_academia"("academia_id", "professor_id");

-- CreateIndex
CREATE UNIQUE INDEX "locais_professor_professor_id_nome_key" ON "locais_professor"("professor_id", "nome");

-- CreateIndex
CREATE INDEX "vinculos_aluno_academia_id_idx" ON "vinculos_aluno"("academia_id");

-- CreateIndex
CREATE INDEX "vinculos_aluno_professor_id_idx" ON "vinculos_aluno"("professor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vinculos_aluno_aluno_id_academia_id_key" ON "vinculos_aluno"("aluno_id", "academia_id");

-- CreateIndex
CREATE UNIQUE INDEX "vinculos_aluno_aluno_id_professor_id_key" ON "vinculos_aluno"("aluno_id", "professor_id");

-- CreateIndex
CREATE INDEX "apelidos_vinculo_apelido_idx" ON "apelidos_vinculo"("apelido");

-- CreateIndex
CREATE UNIQUE INDEX "apelidos_vinculo_vinculo_id_apelido_key" ON "apelidos_vinculo"("vinculo_id", "apelido");

-- CreateIndex
CREATE INDEX "codigos_vinculo_codigo_idx" ON "codigos_vinculo"("codigo");

-- CreateIndex
CREATE INDEX "exercicio_alias_alias_idx" ON "exercicio_alias"("alias");

-- CreateIndex
CREATE INDEX "exercicio_alias_exercicio_id_idx" ON "exercicio_alias"("exercicio_id");

-- CreateIndex
CREATE INDEX "exercicios_escopo_idx" ON "exercicios"("escopo");

-- CreateIndex
CREATE INDEX "exercicios_academia_id_idx" ON "exercicios"("academia_id");

-- CreateIndex
CREATE INDEX "exercicios_dono_id_idx" ON "exercicios"("dono_id");

-- CreateIndex
CREATE INDEX "turmas_academia_id_idx" ON "turmas"("academia_id");

-- CreateIndex
CREATE INDEX "turmas_local_id_idx" ON "turmas"("local_id");

-- AddForeignKey
ALTER TABLE "academias" ADD CONSTRAINT "academias_conta_id_fkey" FOREIGN KEY ("conta_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores_academia" ADD CONSTRAINT "professores_academia_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professores_academia" ADD CONSTRAINT "professores_academia_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locais_professor" ADD CONSTRAINT "locais_professor_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_aluno" ADD CONSTRAINT "vinculos_aluno_aluno_id_fkey" FOREIGN KEY ("aluno_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_aluno" ADD CONSTRAINT "vinculos_aluno_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_aluno" ADD CONSTRAINT "vinculos_aluno_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_aluno" ADD CONSTRAINT "vinculos_aluno_turma_id_fkey" FOREIGN KEY ("turma_id") REFERENCES "turmas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vinculos_aluno" ADD CONSTRAINT "vinculos_aluno_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locais_professor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apelidos_vinculo" ADD CONSTRAINT "apelidos_vinculo_vinculo_id_fkey" FOREIGN KEY ("vinculo_id") REFERENCES "vinculos_aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_vinculo" ADD CONSTRAINT "codigos_vinculo_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "codigos_vinculo" ADD CONSTRAINT "codigos_vinculo_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "locais_professor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicios" ADD CONSTRAINT "exercicios_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicios" ADD CONSTRAINT "exercicios_dono_id_fkey" FOREIGN KEY ("dono_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_alias" ADD CONSTRAINT "exercicio_alias_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercicio_alias" ADD CONSTRAINT "exercicio_alias_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testes_carga" ADD CONSTRAINT "testes_carga_lancado_por_id_fkey" FOREIGN KEY ("lancado_por_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "testes_carga" ADD CONSTRAINT "testes_carga_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_treinador_id_fkey" FOREIGN KEY ("treinador_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_academia_id_fkey" FOREIGN KEY ("academia_id") REFERENCES "academias"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "importacoes" ADD CONSTRAINT "importacoes_professor_id_fkey" FOREIGN KEY ("professor_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Regras que o Prisma não expressa: cada registro tem exatamente um dono
ALTER TABLE "vinculos_aluno" ADD CONSTRAINT "vinculos_aluno_um_dono"
  CHECK (("academia_id" IS NULL) <> ("professor_id" IS NULL));
ALTER TABLE "turmas" ADD CONSTRAINT "turmas_um_dono"
  CHECK (("academia_id" IS NULL) <> ("local_id" IS NULL));
ALTER TABLE "codigos_vinculo" ADD CONSTRAINT "codigos_vinculo_dono"
  CHECK (
    ("tipo" IN ('ALUNOS_ACADEMIA', 'PROFESSORES_ACADEMIA') AND "academia_id" IS NOT NULL AND "professor_id" IS NULL)
    OR ("tipo" = 'ALUNOS_PROFESSOR' AND "professor_id" IS NOT NULL AND "academia_id" IS NULL)
  );
-- O dono pode ficar nulo quando a conta dele é excluída (o exercício vira só histórico)
ALTER TABLE "exercicios" ADD CONSTRAINT "exercicios_dono_do_escopo"
  CHECK (
    ("escopo" = 'PADRAO' AND "academia_id" IS NULL AND "dono_id" IS NULL)
    OR ("escopo" = 'ACADEMIA' AND "dono_id" IS NULL)
    OR ("escopo" IN ('PROFESSOR', 'PESSOAL') AND "academia_id" IS NULL)
  );

-- Um código ativo não pode se repetir (códigos revogados podem)
CREATE UNIQUE INDEX "codigos_vinculo_codigo_ativo" ON "codigos_vinculo"("codigo") WHERE "revogado_em" IS NULL;

-- Nome do exercício padrão continua único
CREATE UNIQUE INDEX "exercicios_nome_padrao" ON "exercicios"("nome") WHERE "escopo" = 'PADRAO';
