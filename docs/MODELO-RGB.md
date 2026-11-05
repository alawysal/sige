# Modelo SIGE RGB

O projecto usa agora `SIGE_RGB.html` como referência visual e funcional, mantendo os HTML anteriores. O ficheiro `mysql_schema.sql` foi conservado tal como fornecido para referência dos campos. A aplicação continua em `/sige`, com Angular, API Spring Boot e MySQL em Docker.

## Processos individuais

Em **Alunos → Novo Aluno / Editar**, é possível carregar ou remover a fotografia, escolher vários anexos entregues e várias deficiências. A opção **Nenhuma** é exclusiva. A selecção também funciona com o teclado. Os campos de filiação, documentação, residência, contacto, escola anterior, região e naturalidade permanecem no processo individual.

Fotografias e logotipos aceitam PNG/JPEG até 5 MB. O navegador reduz a imagem para, no máximo, 640 píxeis no lado maior e converte-a em JPEG; a API verifica o formato, o conteúdo e os limites antes de guardar. Os ficheiros originais não são arquivados. Uma fotografia com transparência recebe fundo branco. Os anexos representam a lista de documentos entregues, não o carregamento dos respectivos ficheiros.

No processo do aluno, a fotografia pode ser substituída ou removida antes de **Guardar**; **Cancelar** mantém a fotografia anterior. É possível voltar a escolher o mesmo ficheiro após removê-lo. Os campos de data abrem o calendário ao clicar e conservam a introdução pelo teclado.

## Matrículas, propinas e pagamentos

A nova rubrica **Confirmação de Matrículas** permite consultar o ano lectivo, confirmar ou rejeitar matrículas pendentes. Uma renovação mantém a verificação das avaliações e das propinas do ano de origem no servidor, incluindo no momento de confirmar. Exportar não confirma a matrícula.

**Classes**, **Turmas**, **Matrículas**, **Dívidas por Turma** e **Pagamentos / Propinas** permitem seleccionar o ano lectivo. As tarifas da classe continuam independentes por ano e o total é calculado como mensalidade × meses + inscrição.

Em **Pagamentos / Propinas**, escolha o ano, seleccione o aluno em **Pagamentos individuais** e clique em **Lista de Pagamentos**. O documento inclui os pagamentos ligados à matrícula desse ano, os talões, as datas, as rubricas, as formas de pagamento e o total. A data do pagamento, por si só, não determina o ano lectivo.

Em **Registar Pagamento**, o aluno e o tipo determinam automaticamente o valor: mensalidade, mensalidade × 3 ou mensalidade × meses para a propina mensal, trimestral ou anual. A taxa de inscrição é calculada separadamente. Estes valores usam a tarifa do ano seleccionado e são verificados pela API; outras rubricas permitem introdução manual. Escolher **Cheque** mostra o campo obrigatório **Nº do Cheque**, incluído no recibo e na lista individual.

## Documentos e impressão

**Documentos Oficiais** apresenta apenas alunos aprovados, com avaliações completas, matrícula confirmada ou concluída e sem dívida de propinas no ano activo. A API volta a verificar estas condições durante a emissão; alterar o pedido no navegador não contorna a regra.

- Certificado de frequência e certificado de conclusão: nome, nascimento, naturalidade, região, pai, mãe, turma, curso e tabela das disciplinas com nota final e nota por extenso.
- Diploma: os mesmos dados pessoais, média final numérica e por extenso, sem tabela de disciplinas. Continua reservado à conclusão da 12ª classe.
- Listas nominais: apenas alunos matriculados, com idade; cada turma começa numa página própria, identificada pelo curso e pela classe. Turmas extensas podem ocupar mais de uma página, com cabeçalho da tabela repetido.
- Listas colectivas: sem nomes de encarregados, contactos ou moradas dos alunos. O cabeçalho conserva os contactos institucionais da escola.

Boletins, pautas e fichas de avaliação continuam nos respectivos módulos. Os professores só consultam e imprimem as fichas das suas disciplinas; a submissão bloqueia as notas do trimestre. Secretaria e financeiro mantêm as restrições de escrita verificadas pela API.

Em **Configurações → Identificação e Logotipo**, o administrador pode carregar ou remover o logotipo. A imagem guardada aparece no cabeçalho de todos os impressos escolares. A impressão do navegador permite guardar PDF.

O logotipo é guardado imediatamente ao carregar, substituir ou remover; alterações ainda não guardadas nos restantes campos permanecem no formulário. O rótulo **Cidade** substitui **Município**. Todo o grupo **Configurações** (escolas, utilizadores, anos lectivos e parâmetros) é exclusivo do administrador; o director não pode abrir estas páginas nem alterar estes dados pela API.

## Correspondência com o SQL fornecido

A base existente usa as tabelas `sige_*` e as migrações Flyway de `backend/src/main/resources/db/migration/`. Cada módulo conserva todos os campos do HTML num documento JSON, com identificadores, referências relacionais e índices de integridade. Não se executa o `CREATE DATABASE` do SQL de referência sobre a instalação existente.

| Referência | Armazenamento utilizado |
|---|---|
| `tb_alunos` | `sige_alunos`: campos pessoais, `Foto`, `Deficiencias[]` e `AnexosList[]` em `data` |
| `tb_classes` | `sige_classes`: tarifas e regras em `data.PorAno[ano]` |
| `tb_inscricoes` | `sige_inscricoes`: referências ao aluno, turma, curso e ano; estado e confirmação em `data` |
| `tb_atribuicoes`, `tb_notas` | `sige_atribuicoes`, `sige_notas`: professor/turma/matéria/ano, notas inteiras e bloqueios por trimestre |
| `tb_pagamentos` | `sige_pagamentos`: referência obrigatória à matrícula e ao aluno |
| `tb_documentos_emitidos` | `sige_documentosemitidos`: tipo, aluno, matrícula, ano, emissor e data |
| Configuração institucional | `sige_config.data.logo` e demais parâmetros |

O esquema recebido define `Anexos` e `Deficiencia` como ENUM de opção única, contactos como FLOAT e notas com casas decimais. Na implementação, os campos novos usam arrays, os contactos conservam o texto e a API exige notas inteiras. Os campos singulares antigos são mantidos para compatibilidade; a inicialização converte as opções antigas conhecidas sem repor os alunos, matrículas ou pagamentos.

As imagens estão incluídas no JSON persistido e nos backups. O workspace carrega os dados permitidos numa única resposta; para escolas com muitos milhares de fotografias, a evolução indicada é servir imagens separadamente e paginar os processos.

## Repetir a validação

Com a stack Docker iniciada e Node 20 / Chrome disponíveis:

```bash
npm ci --prefix tests
SIGE_CHECK_MYSQL=1 node tests/e2e.cjs
node tests/rgb-features.cjs
node tests/school-rules.cjs
node tests/swagger.cjs
node tests/payment-images.cjs
```

Execute os testes que gravam dados por ordem. Criam processos identificados como teste, removem-nos no final e conservam a auditoria. O teste RGB repõe o logotipo original. Os PDFs de exemplo ficam em `output/pdf/` e os resultados em `artifacts/`.
