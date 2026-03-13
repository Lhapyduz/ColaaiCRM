-- Adiciona novas colunas para detalhes pessoais e profissionais no perfil
ALTER TABLE employees ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS data_nascimento VARCHAR(20);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS turno VARCHAR(100);

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS departamento VARCHAR(100);

ALTER TABLE employees ADD COLUMN IF NOT EXISTS contrato VARCHAR(100);