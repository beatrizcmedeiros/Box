-- Lista padrão de exercícios: entra por migration para existir em todos os bancos, inclusive
-- no publicado (o seed só roda no desenvolvimento). Não altera exercícios que já existem.

INSERT INTO "exercicios" ("nome", "categoria") VALUES
  ('Back Squat', 'LEVANTAMENTO'),
  ('Front Squat', 'LEVANTAMENTO'),
  ('Overhead Squat', 'LEVANTAMENTO'),
  ('Deadlift', 'LEVANTAMENTO'),
  ('Shoulder Press', 'LEVANTAMENTO'),
  ('Push Press', 'LEVANTAMENTO'),
  ('Push Jerk', 'LEVANTAMENTO'),
  ('Bench Press', 'LEVANTAMENTO'),
  ('Clean', 'OLIMPICO'),
  ('Power Clean', 'OLIMPICO'),
  ('Clean & Jerk', 'OLIMPICO'),
  ('Snatch', 'OLIMPICO'),
  ('Power Snatch', 'OLIMPICO')
ON CONFLICT ("nome") DO NOTHING;

-- Power Clean e Power Snatch agora são exercícios próprios: deixam de ser apelidos de
-- Clean e Snatch nos bancos que receberam o seed antigo
DELETE FROM "exercicio_alias"
WHERE "alias" IN ('power clean', 'power snatch')
  AND "exercicio_id" IN (SELECT "id" FROM "exercicios" WHERE "nome" IN ('Clean', 'Snatch'));

-- Nomes alternativos (já normalizados: minúsculas e sem acento), usados na importação da lista
INSERT INTO "exercicio_alias" ("exercicio_id", "alias")
SELECT e."id", a."alias"
FROM (VALUES
  ('Back Squat', 'agachamento livre'),
  ('Back Squat', 'back sq'),
  ('Front Squat', 'agachamento frontal'),
  ('Front Squat', 'front sq'),
  ('Overhead Squat', 'agachamento overhead'),
  ('Overhead Squat', 'ohs'),
  ('Deadlift', 'levantamento terra'),
  ('Deadlift', 'terra'),
  ('Shoulder Press', 'strict press'),
  ('Shoulder Press', 'desenvolvimento'),
  ('Push Press', 'push pres'),
  ('Bench Press', 'supino'),
  ('Bench Press', 'supino reto'),
  ('Clean', 'squat clean'),
  ('Clean & Jerk', 'clean and jerk'),
  ('Clean & Jerk', 'arremesso'),
  ('Snatch', 'arranco'),
  ('Snatch', 'squat snatch')
) AS a("nome", "alias")
JOIN "exercicios" e ON e."nome" = a."nome"
ON CONFLICT ("alias") DO NOTHING;
