-- Cadastro aberto (Fase 2 do plano de vínculos): fim da senha temporária e confirmação
-- do e-mail por código. Contas existentes foram criadas por um professor ou pelo script
-- de administração e são consideradas com e-mail confirmado; quem não sabe a senha usa
-- "Esqueci a senha".

-- CreateEnum
CREATE TYPE "TipoCodigoEmail" AS ENUM ('CONFIRMAR_EMAIL', 'REDEFINIR_SENHA');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "email_verificado_em" TIMESTAMP(3);
UPDATE "usuarios" SET "email_verificado_em" = "criado_em";
ALTER TABLE "usuarios" DROP COLUMN "trocar_senha";

-- CreateTable
CREATE TABLE "codigos_email" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "tipo" "TipoCodigoEmail" NOT NULL,
    "codigo_hash" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "usado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "codigos_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "codigos_email_usuario_id_tipo_idx" ON "codigos_email"("usuario_id", "tipo");

-- AddForeignKey
ALTER TABLE "codigos_email" ADD CONSTRAINT "codigos_email_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
