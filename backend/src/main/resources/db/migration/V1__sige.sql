-- Preserve legacy tables. The SIGE schema uses its own namespace.

CREATE TABLE sige_config (id INT PRIMARY KEY, data JSON NOT NULL, revision BIGINT NOT NULL DEFAULT 0);

CREATE TABLE sige_users (
 id VARCHAR(80) PRIMARY KEY, username VARCHAR(80) NOT NULL UNIQUE,
 password_hash VARCHAR(100) NOT NULL, token_version BIGINT NOT NULL DEFAULT 0, data JSON NOT NULL
);

CREATE TABLE sige_audit (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, created_at VARCHAR(40) NOT NULL,
 actor VARCHAR(80) NOT NULL, action VARCHAR(80) NOT NULL, detail TEXT NOT NULL
);

CREATE TABLE sige_anoslectivos (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL
);

CREATE TABLE sige_escolas (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL
);

CREATE TABLE sige_cursos (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL
);

CREATE TABLE sige_classes (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codescola VARCHAR(80),
 FOREIGN KEY (codescola) REFERENCES sige_escolas(id)
);

CREATE TABLE sige_materias (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL
);

CREATE TABLE sige_funcionarios (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL
);

CREATE TABLE sige_alunos (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL
);

CREATE TABLE sige_turmas (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 ano VARCHAR(80),
 FOREIGN KEY (ano) REFERENCES sige_anoslectivos(id),
 curso VARCHAR(80),
 FOREIGN KEY (curso) REFERENCES sige_cursos(id),
 codescola VARCHAR(80),
 FOREIGN KEY (codescola) REFERENCES sige_escolas(id),
 codfuncionario VARCHAR(80),
 FOREIGN KEY (codfuncionario) REFERENCES sige_funcionarios(id)
);

CREATE TABLE sige_funcoes (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codfuncionario VARCHAR(80),
 FOREIGN KEY (codfuncionario) REFERENCES sige_funcionarios(id),
 codescola VARCHAR(80),
 FOREIGN KEY (codescola) REFERENCES sige_escolas(id)
);

CREATE TABLE sige_atribuicoes (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codfuncionario VARCHAR(80),
 FOREIGN KEY (codfuncionario) REFERENCES sige_funcionarios(id),
 codturma VARCHAR(80),
 FOREIGN KEY (codturma) REFERENCES sige_turmas(id),
 idmateria VARCHAR(80),
 FOREIGN KEY (idmateria) REFERENCES sige_materias(id),
 ano VARCHAR(80),
 FOREIGN KEY (ano) REFERENCES sige_anoslectivos(id),
 UNIQUE(codturma,idmateria,ano)
);

CREATE TABLE sige_inscricoes (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codaluno VARCHAR(80),
 FOREIGN KEY (codaluno) REFERENCES sige_alunos(id),
 ano VARCHAR(80),
 FOREIGN KEY (ano) REFERENCES sige_anoslectivos(id),
 codturma VARCHAR(80),
 FOREIGN KEY (codturma) REFERENCES sige_turmas(id),
 codcurso VARCHAR(80),
 FOREIGN KEY (codcurso) REFERENCES sige_cursos(id),
 UNIQUE(codaluno,ano)
);

CREATE TABLE sige_notas (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codinscricao VARCHAR(80),
 FOREIGN KEY (codinscricao) REFERENCES sige_inscricoes(id),
 codmateria VARCHAR(80),
 FOREIGN KEY (codmateria) REFERENCES sige_materias(id),
 ano VARCHAR(80),
 FOREIGN KEY (ano) REFERENCES sige_anoslectivos(id),
 UNIQUE(codinscricao,codmateria,ano)
);

CREATE TABLE sige_exames (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codinscricao VARCHAR(80),
 FOREIGN KEY (codinscricao) REFERENCES sige_inscricoes(id)
);

CREATE TABLE sige_recursos (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codinscricao VARCHAR(80),
 FOREIGN KEY (codinscricao) REFERENCES sige_inscricoes(id)
);

CREATE TABLE sige_pagamentos (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codaluno VARCHAR(80),
 FOREIGN KEY (codaluno) REFERENCES sige_alunos(id),
 codinscricao VARCHAR(80),
 FOREIGN KEY (codinscricao) REFERENCES sige_inscricoes(id)
);

CREATE TABLE sige_renovacoes (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 idinscricaoantiga VARCHAR(80),
 FOREIGN KEY (idinscricaoantiga) REFERENCES sige_inscricoes(id),
 idinscricaonova VARCHAR(80),
 FOREIGN KEY (idinscricaonova) REFERENCES sige_inscricoes(id)
);

CREATE TABLE sige_documentosemitidos (
 id VARCHAR(80) PRIMARY KEY,
 data JSON NOT NULL,
 codaluno VARCHAR(80),
 FOREIGN KEY (codaluno) REFERENCES sige_alunos(id)
);
