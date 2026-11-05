# Fluxo dos dados: frontend, API e MySQL

A aplicação está em `/sige`. O Angular envia pedidos para `/api` na mesma origem. Em Docker, o Nginx encaminha-os para `backend:8080`; a API liga-se ao serviço MySQL através da rede interna do Compose. O volume `mysql_data` conserva os dados entre reinícios e reconstruções dos containers.

## Gravar e consultar

1. O utilizador preenche um formulário. O renderizador mantém os campos e o desenho do HTML de referência; o serviço Angular `ApiService` compara os dados anteriores com a alteração.
2. O frontend envia `POST /api/transactions` com JWT, `revision` e as alterações (`module`, `kind`, `id`, `record`). Nas edições, `record` contém o registo completo. Não existe armazenamento local dos dados escolares.
3. A API verifica a sessão e o perfil, bloqueia a revisão na base, valida as regras escolares e as relações entre registos. Uma revisão antiga recebe HTTP 409; uma regra inválida recebe 422; uma operação sem permissão recebe 403.
4. A transacção grava nas tabelas `sige_*` do MySQL. Cada módulo tem a sua tabela, com campos JSON e referências relacionais. As alterações são confirmadas em conjunto; uma falha anula a transacção.
5. A API devolve os dados permitidos para a conta e a nova revisão. O frontend actualiza a vista e só apresenta sucesso após a resposta da gravação. Os erros permanecem visíveis; um HTTP 401 encerra a sessão, incluindo nos pedidos de exportação CSV.
6. Ao recarregar a aplicação, `GET /api/workspace` consulta novamente a base. Uma alteração feita pela API ou pelo Swagger aparece no frontend após recarregar os dados. Não existe actualização automática entre sessões: se outra sessão gravar entretanto, a revisão evita sobrescrever essa alteração.

As renovações passam por `POST /api/renewals`, que verifica avaliações, dívidas e o ano de destino antes de criar matrículas pendentes. A exportação é recalculada em `GET /api/exports/renewals`; nunca confirma matrículas.

## Experimentar no Swagger

1. Abra [Swagger](http://localhost:8080/swagger-ui/index.html), expanda `POST /api/auth/login`, clique em **Try it out**, indique a sua conta e execute. Na instalação de demonstração, pode usar `admin` / `admin123`.
2. Copie apenas o valor `token` da resposta. Clique em **Authorize**, cole-o e confirme.
3. Execute `GET /api/workspace` e anote `revision`.
4. Em `POST /api/transactions`, seleccione o exemplo **Criar ou editar aluno**, substitua a revisão pelo valor recebido e escolha um identificador novo para `id` e `record.IdAluno`. Execute. A resposta contém o aluno criado e a nova revisão.
5. Abra `/sige`, entre com uma conta autorizada e consulte **Alunos**. Se a aplicação já estava aberta, recarregue a página. O registo criado estará na lista e pode ser editado pelo formulário.
6. Execute novamente `GET /api/workspace` no Swagger para confirmar a edição. Para remover apenas o aluno de exemplo, use o exemplo de eliminação com o seu identificador e a revisão mais recente.

Todos estes pedidos actuam na base utilizada pela aplicação. As restrições da secretaria, do financeiro e dos professores são verificadas no servidor, incluindo quando o pedido vem do Swagger.

## Verificação automatizada

Com a stack Docker iniciada, execute na raiz do projecto, com Node 20 e Chrome instalados:

```bash
npm ci --prefix tests
node tests/swagger.cjs
SIGE_CHECK_MYSQL=1 node tests/e2e.cjs
```

O primeiro teste abre o Swagger tanto pela porta 8080 como pelo proxy do frontend, inicia sessão na própria interface, autoriza o JWT e consulta o workspace. O segundo percorre os 29 módulos, cria e edita um aluno pelo formulário, cria uma matrícula e um pagamento, e consulta directamente as respectivas tabelas MySQL. Também altera o aluno pela API e confirma o valor no formulário após recarregar. Os registos temporários são removidos no final, mantendo a auditoria.

`SIGE_TEST_URL` permite mudar a origem do frontend; `SIGE_API_URL`, a origem directa usada pelo teste Swagger. `SIGE_TEST_USER` e `SIGE_TEST_PASSWORD` alteram as credenciais administrativas dos testes. O cenário escolar integrado pressupõe os catálogos e contas de professor de demonstração. A verificação SQL usa o serviço `mysql` do Compose deste projecto, sem imprimir as credenciais.

O [modelo RGB](MODELO-RGB.md) acrescenta fotografia, selecções múltiplas, logotipo e documentos condicionados. Estes campos usam a mesma transacção autenticada e a mesma base MySQL; não existe uma segunda base no HTML.
