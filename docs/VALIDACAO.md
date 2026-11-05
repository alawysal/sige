# Validação da implementação

A validação mais recente está em [Validação global — 31/10/2026](VALIDACAO-GLOBAL-2026-10-31.md).

Validação do modelo `SIGE_RGB.html` realizada em 3 de Outubro de 2026, com Angular servido pelo Nginx, API Spring Boot e MySQL em Docker. Em 4 de Outubro foram verificadas as correcções de imagens, calendários, pagamentos e permissões descritas abaixo. As verificações iniciais da instalação e da persistência ocorreram em 28 e 29 de Setembro.

| Verificação | Resultado |
|---|---|
| Build de produção Angular | Passou |
| Integridade das 29 vistas e preservação do CSS da referência RGB | Passou |
| Angular: rejeição de autenticação, sessão expirada e mensagens de erro na exportação CSV | 3 testes passaram |
| Backend: regras escolares, permissões, concorrência, renovações, imagens, documentos, pagamentos, OpenAPI e transacções HTTP | 38 testes passaram; sem falhas ou erros |
| Swagger pela API e pelo proxy do frontend: JSON/YAML, login, Authorize e consulta autenticada | Passou nos dois endereços |
| Navegador: navegação pelos 29 módulos | Passou; sem erros JavaScript detectados |
| Alunos: criação, edição, validação e leitura após recarregar | Passou |
| Frontend → API → MySQL: aluno, matrícula e pagamento | Valores confirmados por consulta SQL às tabelas; registos temporários removidos |
| Alteração pela API → MySQL → formulário Angular após recarregar | Passou, incluindo texto com acentos |
| Matrículas, pagamentos, recibos e impressão PDF | Passou |
| Professor: restrições de avaliação e bloqueio por trimestre | Passou |
| Alterações concorrentes com revisão desactualizada | Rejeitadas com HTTP 409 |
| Documentos, criação de utilizador e invalidação de sessão ao desactivar a conta | Passou |
| Navegação em ecrã móvel | Passou |
| Persistência de registos e tarifas anuais após reiniciar MySQL, backend e frontend | Confirmada na verificação de Setembro; registo temporário removido |
| Tarifas anuais e fórmula mensalidade × meses + inscrição, pelo formulário | Passou |
| Secretaria sem pagamentos; financeiro sem criar alunos ou matrículas | Passou pela API e pelo navegador |
| Professor sem pautas/boletins; ficha da sua disciplina e notas inteiras | Passou pela API e pelo navegador |
| Pré-visualização de exame especial sem substituir a nota do exame normal | Passou |
| Acesso directo por URL a módulos sem permissão | Redireccionado ao painel |
| Listas agrupadas e listas nominais com idades, sem contactos dos alunos | Passou |
| Exportação de renovações pendentes e confirmação com nova verificação das dívidas | Passou; exportação não confirma a matrícula |
| Fotografia, múltiplos anexos e deficiências: formulário → API → MySQL → recarregamento | Passou; valores e imagem comparados directamente na base |
| Imagens inválidas, selecções incompatíveis e logotipo sem permissão administrativa | Rejeitados pela API |
| Pagamentos individuais por ano da matrícula | Passou, incluindo pagamentos de dois anos lectivos feitos na mesma data |
| Documentos oficiais: aprovação, avaliações completas, matrícula e ausência de dívida | Verificados na API e no navegador; também no estado final da transacção |
| Certificados com dados pessoais, disciplinas e notas por extenso | Impressos e revistos visualmente em PDF |
| Diploma com média por extenso e sem tabela de disciplinas | Impresso e revisto visualmente em PDF |
| Listas nominais com apenas matriculados, idades e uma turma por início de página | Seis grupos verificados no PDF, sem página final vazia |
| Logotipo persistido e utilizado nos impressos | Passou; logotipo original reposto após o teste |
| Estado final dos três serviços Docker | `healthy` |

## Comparação com `SIGE_RGB.html`

Em Chrome, com janela de 1440 × 1000, a comparação automatizada do login apresentou **0,000% de diferenças detectadas** segundo a tolerância de cor do teste. O painel manteve as dimensões da barra lateral e do cabeçalho; a diferença de imagem foi **15,743%**. A revisão visual identificou diferenças nos valores, nomes e gráficos decorrentes dos dados escolares preservados, que diferem da demonstração incluída no HTML. As dimensões e a posição do formulário de aluno coincidiram com a referência após terminar a animação. Foram também capturados ecrãs móveis.

Esta comparação cobre estes ecrãs; não constitui uma comparação visual exaustiva dos 29 módulos nem uma igualdade de todos os píxeis do painel. A navegação pelos 29 módulos e os fluxos acima foram verificados separadamente. Os HTML e SQL recebidos foram conservados sem alterações; a correspondência com a base existente está em [MODELO-RGB.md](MODELO-RGB.md).

## Correcções de 4 de Outubro

O teste `tests/payment-images.cjs` usa os botões visíveis para abrir o selector nativo de ficheiros, substituir e remover fotografias e logotipos, voltar a seleccionar o mesmo ficheiro e verificar os valores após recarregar. Cancelar a edição do aluno conserva a fotografia anterior; actualizar o logotipo conserva os outros campos ainda não guardados no formulário.

Os calendários são abertos por clique nos formulários de aluno, matrícula e pagamento; uma data é seleccionada pelo teclado no calendário nativo. O teste verifica que o clique não é cancelado e que não surge a camada de gravação. A correcção impede o evento de fundo da janela de cancelar cliques nos campos interiores.

O formulário de pagamento verifica os valores mensal, trimestral, anual e inscrição, o ano da matrícula e a passagem para uma rubrica de valor manual. A gravação de um cheque sem número é recusada; o número com zeros iniciais é confirmado no MySQL, no recibo e na lista individual. As restrições do director abrangem os menus, os endereços directos e as alterações pela API. Os rótulos de escolas e configurações usam Cidade.

Os resultados adicionais estão em `artifacts/payment-images-build.log` (38 testes Java), `artifacts/payment-images-frontend.log` (build final), `artifacts/payment-images.log` (navegador e MySQL) e `artifacts/payment-images-e2e.log` (regressão dos 29 módulos). Os testes criam os seus próprios processos e pagamentos e repõem o logotipo original no final.

## Evidências e dados dos testes

Os resultados estão em `artifacts/rgb-build.log` (34 testes Java), `rgb-angular-tests.log` (3 testes Angular), `rgb-e2e.log`, `rgb-school-rules.log`, `rgb-features.log`, `rgb-swagger.log` e `rgb-visual.log`. O build final do frontend está em `artifacts/rgb-final-frontend.log`. As capturas do Swagger mostram a documentação antes da autenticação, sem tokens.

Os cinco PDFs em `output/pdf/rgb-*.pdf` incluem certificados de frequência e conclusão, diploma, pagamentos individuais e listas nominais. Cada documento individual ocupa uma página; a lista nominal ocupa seis páginas. As dez páginas foram renderizadas e inspeccionadas visualmente. Os ficheiros usam dados de demonstração e processos temporários, não documentos emitidos para utilização oficial.

Os dados criados pelos testes integrados foram removidos, mantendo o histórico de auditoria. Durante a adaptação, um teste detectou que o HTML arredondava uma nota decimal e alterou duas avaliações existentes. A conversão foi corrigida, os valores anteriores foram recuperados do histórico binário do MySQL e comparados integralmente, preservando desbloqueios administrativos posteriores. A reposição ficou registada na auditoria como `reposicao_teste`. O teste corrigido verifica a rejeição de decimais sem gravar avaliações existentes; os testes de emissão usam processos próprios e removem-nos no final.

## Repetir as verificações adicionais

Os comandos principais de build e testes estão no [README](../README.md#desenvolvimento-e-testes). Os testes de navegador requerem Node 20, Chrome e as dependências instaladas com `npm ci --prefix tests`.

Para repetir a validação do Swagger e a consulta directa ao MySQL, na raiz do projecto:

```bash
node tests/swagger.cjs
SIGE_CHECK_MYSQL=1 node tests/e2e.cjs
node tests/school-rules.cjs
node tests/rgb-features.cjs
node tests/payment-images.cjs
```

Execute os testes que escrevem dados por ordem, numa instalação de demonstração. O teste RGB repõe o logotipo original no final.

O percurso de cada pedido e a utilização dos exemplos estão em [FLUXO-DADOS.md](FLUXO-DADOS.md).

Para comparar com a referência, use uma instalação de demonstração e a API na porta 8080. Depois do build Angular, inicie o servidor de comparação numa porta 4201 livre:

```bash
node tests/preview-server.cjs
```

Noutro terminal:

```bash
SIGE_TEST_URL=http://localhost node tests/visual.cjs
```

Para verificar a persistência, com a stack de demonstração em execução, execute os comandos pela ordem indicada. O reinício interrompe brevemente o acesso à aplicação. O último comando confirma a existência do registo, compara as tarifas anuais e remove o registo temporário:

```bash
node tests/persistence.cjs create
docker compose restart mysql backend frontend
docker compose up -d --wait --wait-timeout 120
node tests/persistence.cjs verify
```
