# SIGE Guiné-Bissau

Aplicação de gestão escolar com Angular 16, utilitários Bootstrap 5, Spring Boot 3 / Java 17, autenticação JWT e MySQL 8 em Docker. Veja as funcionalidades e a correspondência com a base existente em [MODELO-RGB.md](docs/MODELO-RGB.md).

## Produção inicial

O pacote de produção tem configuração e base próprias, sem dados ou contas de demonstração. Consulte [PRODUCAO.md](docs/PRODUCAO.md) para instalar, configurar HTTPS, criar backups, repor dados e actualizar.

```bash
./scripts/prepare-production.sh
# Rever .env.production (nome da escola, ano lectivo e porta).
./start-prod.sh
```

O acesso inicial é local, em **http://127.0.0.1:8088/sige**. A senha inicial de `admin` é gerada em `.env.production`. Servidor e domínio ainda não definidos; o pacote não publica o serviço na Internet.

Para gerar o pacote de instalação, sem segredos nem dados locais:

```bash
./scripts/package-production.sh
```

## Instalação local existente / demonstração

Esta instalação mantém o seu `.env`, o volume MySQL e as contas existentes. Não usa o novo `start-prod.sh`.

```bash
docker compose up --build -d --wait --wait-timeout 300
```

Abra **http://localhost/sige**. A API fica em `http://localhost:8080/api/health`. O Swagger da instalação local fica em [http://localhost/swagger-ui/index.html](http://localhost/swagger-ui/index.html); está desactivado na instalação de produção.

| Perfil de demonstração | Utilizador | Palavra-passe |
|---|---|---|
| Administrador | admin | admin123 |
| Director | diretor | dir123 |
| Secretaria | secretaria | sec123 |
| Financeiro | financeiro | fin123 |
| Professor de Informática | professor | prof123 |
| Professor de Matemática | prof2 | prof123 |

As contas e os dados de demonstração são criados **uma única vez**, numa base ainda não inicializada. Reiniciar ou reconstruir os containers não repõe os dados. A base é conservada no volume `mysql_data` do projecto Compose. As tabelas da implementação anterior ficam preservadas; as novas tabelas usam o prefixo `sige_`.

## Funcionalidades

- Ministério: pesquisa de alunos por nome, número de processo ou escola, em todas as escolas ou na escola seleccionada, com consulta da ficha sem edição.
- Login com brasão da Guiné-Bissau e campos de acesso vazios; bandeira nacional no cabeçalho da aplicação.
- Ficha individual e impressão com histórico escolar por ano, disciplinas, médias trimestrais, exame normal, recurso e resultado. Avaliações incompletas são identificadas como parciais. Os dados pessoais e familiares são impressos numa tabela compacta com rótulos e valores alinhados.
- Documentos Oficiais: pesquisa por nome ou número de processo, sem distinguir acentos, mantendo os critérios de elegibilidade e os filtros de escola e ano.

- Os 29 módulos do HTML: painel, alunos, matrículas, confirmação de matrículas, renovações, turmas, classes, cursos, matérias, minhas turmas, fichas de avaliação por disciplina, notas, exames finais, recursos, pautas, boletins, funcionários, funções, atribuições, pagamentos, recibos, dívidas por turma, exportação de alunos elegíveis, documentos, relatórios, escolas, utilizadores, anos lectivos e configurações.
- Fotografia do aluno, anexos e deficiências com selecção múltipla; logotipo da escola nos impressos.
- Lista dos pagamentos individuais por ano lectivo; certificados de frequência e conclusão com notas por extenso e diplomas sem tabela de disciplinas.
- Processos individuais completos, histórico de matrículas e pagamentos; pesquisa e exportação CSV de renovações elegíveis.
- Notas inteiras de 0 a 20 (escala configurável), com MAC, NPP e NPT em cada um dos três trimestres; exame normal, especial e de acesso registados separadamente; recursos sujeitos às regras da classe. O exame normal participa na média final, com os pesos configurados.
- Professores só recebem e submetem notas das suas atribuições por turma, disciplina e ano. Podem imprimir a ficha da sua disciplina; não acedem a pautas gerais nem a boletins. A submissão bloqueia o trimestre, mantendo os seguintes disponíveis. O bloqueio geral da atribuição suspende todos os lançamentos; bloquear e desbloquear pela administração permite corrigir uma submissão.
- As classificações finais exigem todas as avaliações e o exame normal quando este tiver peso. Médias parciais continuam visíveis, mas não aprovam o aluno nem permitem renovação automática.
- Renovações no servidor: só alunos com avaliações completas e propinas em dia no ano de origem. Aprovados avançam, reprovados repetem; alunos em curso, em recurso ou no fim do percurso não são renovados. As novas inscrições ficam **Pendentes** até confirmação pela secretaria, direcção ou administração. São usadas/criadas turmas do **ano de destino**, respeitando curso, turno e capacidade. Atribuições são copiadas para as turmas criadas e devem ser revistas pela direcção.
- Recibos, fichas, comprovativos, pautas, boletins, declarações, certificados, diplomas e relatórios com os modelos de impressão do HTML. A opção de impressão do navegador permite guardar PDF. A rubrica Documentos Oficiais exige aprovação, avaliações completas e ausência de dívida; diplomas exigem também conclusão da 12ª classe.
- Tarifas e regras de classe por ano lectivo: total = mensalidade × meses + inscrição. Ao criar um ano, copia-se o catálogo do ano activo, que pode ser ajustado sem alterar os anteriores. Cursos têm os seus anos activos.
- Secretaria não lança pagamentos; financeiro não cria alunos nem matrículas. Estas restrições são verificadas também pela API.
- Configurações, escolas, utilizadores e anos lectivos exclusivos do administrador, incluindo a activação do ano. O director mantém a gestão escolar e financeira.
- Propinas calculadas automaticamente pela tarifa da matrícula; pagamentos por cheque exigem número, incluído no recibo e na lista individual.
- Exportação para o ano seguinte: exige matrícula de destino pendente, avaliações completas e propinas em dia na matrícula de origem. Confirmar retira o aluno desta lista; exportar não confirma a matrícula.
- Dívidas calculadas pelos valores pagos na mesma matrícula, desde a abertura até à data actual ou fecho do ano, com limite dos meses da classe. As listas colectivas apresentam curso, classe, turma e idades, sem encarregados, contactos ou moradas. O processo individual conserva os campos completos.
- Backup JSON e reposição pela administração, com validação e transacção. As contas e a auditoria são preservadas. O backup JSON não inclui palavras-passe; para uma cópia integral, utilize também o backup MySQL.

## Design e organização

O CSS original está integralmente em `frontend/src/styles.css`. Bootstrap é usado pelas suas classes utilitárias, sem substituir a identidade visual dos componentes originais. Angular gere a sessão, o menu, os endereços, os pedidos HTTP e o ciclo de vida dos ecrãs.

Para manter os formulários, tabelas e impressos exactamente como a referência, `scripts/build-promax.cjs` converte as vistas originais num renderizador modular, chamado pelo componente Angular. Os eventos do HTML são convertidos, durante a geração, em funções fechadas sobre os seus dados. Não há `eval`, iframe, scripts globais ou base de dados em `localStorage`. Só o token da sessão é guardado em `sessionStorage`.

- `frontend/src/app/core/`: cliente HTTP, contratos e navegação.
- `frontend/src/app/promax/`: renderizador das vistas, gerado a partir do HTML.
- `scripts/school-adaptations.cjs`, `scripts/rgb-adaptations.cjs`, `scripts/rgb-runtime.js`, `scripts/renderer-prefix.js` e `scripts/renderer-suffix.js`: integração transaccional e operações que substituem o armazenamento local do protótipo.
- `backend/src/main/java/com/escola/gestaoescolar/sige/`: autenticação, persistência, permissões e regras escolares.
- `backend/src/main/resources/db/migration/`: migrações Flyway versionadas.
- `backend/legacy/`: implementação anterior preservada, fora da compilação.
- `docs/API.md`: contrato da API e modelo de dados.
- [docs/FLUXO-DADOS.md](docs/FLUXO-DADOS.md): percurso dos dados entre formulários, API e MySQL, com instruções para experimentar no Swagger.

O build usa o renderizador existente em `frontend/src/app/promax`. Os HTML antigos já não estão nesta pasta; a regeneração pelos adaptadores só é possível se a referência original for reposta:

```bash
npm ci --prefix frontend
# Apenas se SIGE_RGB.html estiver disponível: node scripts/build-promax.cjs
npm run build --prefix frontend
```

Os dados de demonstração estão em `backend/src/main/resources/demo-data.json`. O script histórico `scripts/extract-seed.cjs` só pode regenerá-los se o HTML original for reposto. A produção usa uma inicialização limpa, sem copiar esses registos. `gb-defaults.json` fornece os dados institucionais de demonstração da Guiné-Bissau. Isso não altera uma base já inicializada.

A actualização preserva alunos, matrículas, pagamentos e os respectivos montantes. As tarifas existentes são copiadas para os anos já registados. Não é efectuada conversão cambial; reveja os valores em FCFA nas configurações anuais. Dados institucionais personalizados são preservados; apenas a identificação original de demonstração de Maputo é substituída pelo modelo de Bissau.

## Desenvolvimento e testes

Use Node 20 e Java 17. Para desenvolvimento Angular, com backend/MySQL em execução:

```bash
npm ci --prefix frontend
npm start --prefix frontend
```

Abra `http://localhost:4201/sige`; o proxy de desenvolvimento encaminha `/api`, `/swagger-ui` e `/v3/api-docs` para a porta 8080. O Swagger também fica disponível em `http://localhost:4201/swagger-ui/index.html`.

```bash
# Backend: regras, permissões, concorrência, renovações e contrato Swagger
mvn -f backend/pom.xml verify

# Mesmos testes dentro do build Docker
docker compose build backend

# Integridade das vistas, pesquisa do Ministério e histórico escolar
node tests/renderer.test.cjs

# Autenticação Angular e erros de exportação CSV
npm test --prefix frontend -- --watch=false --browsers=ChromeHeadless

# Testes integrados sequenciais, incluindo pesquisa em Documentos Oficiais
# Requer Node 20, stack Docker em execução e Chrome instalado
npm ci --prefix tests
npm run test:global --prefix tests

# Execução individual
node tests/e2e.cjs
node tests/school-rules.cjs
node tests/rgb-features.cjs
node tests/payment-images.cjs

# Swagger: documentação, login, Authorize e pedidos autenticados
node tests/swagger.cjs

# Fluxo completo com consultas directas ao MySQL do Docker
SIGE_CHECK_MYSQL=1 node tests/e2e.cjs
```

Os testes JUnit usam H2 apenas como base de testes. A aplicação usa MySQL, incluindo em desenvolvimento. Os testes de navegador criam dados identificados como teste e removem-nos no final; não restauram nem apagam a base existente.

Consulte os [resultados da validação](docs/VALIDACAO.md), incluindo a comparação visual com o HTML e a persistência após reiniciar os serviços.

## Configuração

Veja `.env.example`. `WEB_PORT`, `API_PORT` e `DB_PORT` permitem resolver conflitos de portas. As portas da API e do MySQL estão ligadas apenas ao endereço local; o Nginx serve a aplicação e encaminha a API.

Para dados reais, use `.env.production`, gerado por `scripts/prepare-production.sh`, e o Compose separado descrito em [PRODUCAO.md](docs/PRODUCAO.md). A produção desactiva a demonstração, a sua reposição e o Swagger. As alterações de configuração não apagam uma base já inicializada; não reutilize o volume local para a primeira instalação limpa.

```bash
docker compose ps
docker compose logs -f
# Pára os serviços sem apagar o volume da base de dados
docker compose down
```

Não use `down -v` para uma paragem normal: essa opção remove os dados persistidos.
