-- CreateTable
CREATE TABLE "aluno_apelido" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "apelido" TEXT NOT NULL,

    CONSTRAINT "aluno_apelido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "aluno_apelido_apelido_key" ON "aluno_apelido"("apelido");

-- CreateIndex
CREATE INDEX "aluno_apelido_usuario_id_idx" ON "aluno_apelido"("usuario_id");

-- AddForeignKey
ALTER TABLE "aluno_apelido" ADD CONSTRAINT "aluno_apelido_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
