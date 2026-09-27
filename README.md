# SIGE Nacional

Aplicação de gestão escolar baseada em `0001_promax.html`, com Angular 16, utilitários Bootstrap 5, Spring Boot 3 / Java 17, autenticação JWT e MySQL 8 em Docker. O HTML de referência permanece intacto.

## Iniciar

É necessário Docker com Compose e o Docker Desktop em execução.

```bash
./start-prod.sh
```

Ou, se já existir `.env`:

```bash
docker compose up --build -d --wait --wait-timeout 240
```

Abra **http://localhost**. A API fica em `http://localhost:8080/api/health`. O frontend usa `/api` na mesma origem; o navegador não precisa de conhecer o endereço interno do backend.

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

- Os 25 módulos do HTML: painel, alunos, matrículas, renovações, turmas, classes, cursos, matérias, minhas turmas, notas, exames finais, recursos, pautas, boletins, funcionários, funções, atribuições, pagamentos, recibos, documentos, relatórios, escolas, utilizadores, anos lectivos e configurações.
- Processos individuais completos, histórico de matrículas e pagamentos; pesquisa e exportação CSV.
- MAC, NPP e NPT em cada um dos três trimestres; exame normal, especial e de acesso registados separadamente; recursos sujeitos às regras da classe. O exame normal participa na média final, com os pesos configurados.
- Professores só submetem avaliações das suas atribuições. A submissão bloqueia o trimestre, mantendo os seguintes disponíveis. O bloqueio geral da atribuição suspende todos os lançamentos; bloquear e desbloquear pela administração permite corrigir uma submissão.
- As classificações finais exigem todas as avaliações e o exame normal quando este tiver peso. Médias parciais continuam visíveis, mas não aprovam o aluno nem permitem renovação automática.
- Renovações no servidor: aprovados avançam, reprovados repetem; alunos em curso, em recurso ou no fim do percurso não são renovados. São usadas/criadas turmas do **ano de destino**, respeitando curso, turno e capacidade. Atribuições são copiadas para as turmas criadas e devem ser revistas pela direcção.
- Recibos, fichas, comprovativos, pautas, boletins, declarações, certificados, diplomas e relatórios com os modelos de impressão do HTML. A opção de impressão do navegador permite guardar PDF. Certificados exigem aprovação; diplomas exigem também conclusão da 12ª classe.
- Backup JSON e reposição pela administração, com validação e transacção. As contas e a auditoria são preservadas. O backup JSON não inclui palavras-passe; para uma cópia integral, utilize também o backup MySQL.

## Design e organização

O CSS original está integralmente em `frontend/src/styles.css`. Bootstrap é usado pelas suas classes utilitárias, sem substituir a identidade visual dos componentes originais. Angular gere a sessão, o menu, os endereços, os pedidos HTTP e o ciclo de vida dos ecrãs.

Para manter os formulários, tabelas e impressos exactamente como a referência, `scripts/build-promax.cjs` converte as vistas originais num renderizador modular, chamado pelo componente Angular. Os eventos do HTML são convertidos, durante a geração, em funções fechadas sobre os seus dados. Não há `eval`, iframe, scripts globais ou base de dados em `localStorage`. Só o token da sessão é guardado em `sessionStorage`.

- `frontend/src/app/core/`: cliente HTTP, contratos e navegação.
- `frontend/src/app/promax/`: renderizador das vistas, gerado a partir do HTML.
- `scripts/renderer-prefix.js` e `scripts/renderer-suffix.js`: integração transaccional e operações que substituem o armazenamento local do protótipo.
- `backend/src/main/java/com/escola/gestaoescolar/sige/`: autenticação, persistência, permissões e regras escolares.
- `backend/src/main/resources/db/migration/`: migrações Flyway versionadas.
- `backend/legacy/`: implementação anterior preservada, fora da compilação.
- `docs/API.md`: contrato da API e modelo de dados.

Se alterar o HTML de referência ou os adaptadores, regenere as vistas:

```bash
npm ci --prefix frontend
node scripts/build-promax.cjs
npm run build --prefix frontend
```

Os dados iniciais estão em `demo-data.json`. `node scripts/extract-seed.cjs` regenera-os de forma determinística a partir do HTML, consolidando os trimestres e corrigindo os identificadores repetidos do protótipo. Isso não altera uma base já inicializada.

## Desenvolvimento e testes

Use Node 20 e Java 17. Para desenvolvimento Angular, com backend/MySQL em execução:

```bash
npm ci --prefix frontend
npm start --prefix frontend
```

Abra `http://localhost:4201`; o proxy de desenvolvimento encaminha `/api` para a porta 8080.

```bash
# Backend: regras, permissões, concorrência e renovações
mvn -f backend/pom.xml verify

# Mesmos testes dentro do build Docker
docker compose build backend

# Integridade das vistas e CSS de referência
npm test --prefix frontend

# Componente Angular de autenticação
npm run test:unit --prefix frontend

# Verificação integrada (stack em execução; Chrome instalado)
npm ci --prefix tests
node tests/e2e.cjs
```

Os testes JUnit usam H2 apenas como base de testes. A aplicação usa MySQL, incluindo em desenvolvimento. Os testes de navegador criam dados identificados como teste e removem-nos no final; não restauram nem apagam a base existente.

Consulte os [resultados da validação](docs/VALIDACAO.md), incluindo a comparação visual com o HTML e a persistência após reiniciar os serviços.

## Configuração

Veja `.env.example`. `WEB_PORT`, `API_PORT` e `DB_PORT` permitem resolver conflitos de portas. As portas da API e do MySQL estão ligadas apenas ao endereço local; o Nginx serve a aplicação e encaminha a API.

Para uma instalação com dados reais, configure **antes da primeira inicialização** `DEMO_SEED=false`, uma `ADMIN_PASSWORD` com pelo menos 12 caracteres, palavras-passe MySQL próprias e um `JWT_SECRET` próprio (por exemplo, `openssl rand -base64 48`). Nessa modalidade é criada apenas a conta `admin`, além da estrutura escolar inicial. A publicação na Internet deve usar HTTPS no proxy de entrada. A mudança posterior de `DEMO_SEED` não modifica uma base já inicializada.

```bash
docker compose ps
docker compose logs -f
# Pára os serviços sem apagar o volume da base de dados
docker compose down
```

Não use `down -v` para uma paragem normal: essa opção remove os dados persistidos.
