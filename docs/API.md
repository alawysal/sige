# API SIGE

Todas as rotas usam o prefixo `/api`. Excepto login e health, exigem `Authorization: Bearer <token>`. A API verifica a conta activa e a versão da sessão em cada pedido. Uma alteração da conta invalida os tokens anteriores.

## Swagger / OpenAPI

- API directa: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html).
- Pelo Nginx do frontend: [http://localhost/swagger-ui/index.html](http://localhost/swagger-ui/index.html).
- Contrato: `/v3/api-docs` e `/v3/api-docs.yaml`, nos mesmos endereços.

A documentação e os seus ficheiros estáticos são públicos; os dados escolares continuam protegidos por JWT e pelas permissões da conta. O botão **Authorize** recebe apenas o token obtido em `POST /api/auth/login`. O Swagger não conserva a autorização após recarregar a página. O servidor relativo `/` permite executar os pedidos na origem onde a documentação foi aberta.

Os nove endpoints têm descrições, respostas de erro e exemplos de escrita. As operações de reposição de backup e dados de demonstração são identificadas como substituição dos dados actuais. Veja o [fluxo completo e o exemplo de utilização](FLUXO-DADOS.md).

A integração usa `springdoc-openapi-starter-webmvc-ui` 2.6.0, correspondente a Spring Boot 3.3.x na [matriz oficial de compatibilidade](https://springdoc.org/v2/#what-is-the-compatibility-matrix-of-springdoc-openapi-with-spring-boot).

## Endpoints

| Método | Rota | Função |
|---|---|---|
| POST | `/auth/login` | `{username,password}` → `{token,user}` |
| GET | `/auth/me` | Conta autenticada, sem palavra-passe |
| GET | `/workspace` | Dados permitidos, configurações, resultados e revisão |
| POST | `/transactions` | Alterações atómicas com controlo de revisão |
| POST | `/renewals` | `{revision,origin,destination}` → dados actualizados e `renovadas` |
| GET | `/exports/renewals?year=2027/2028` | CSV de renovações pendentes elegíveis; administrador, director ou secretaria |
| POST | `/backup/restore` | `{revision,data}`; administrador |
| POST | `/demo/reset` | `{revision}`; administrador |
| GET | `/health` | Estado da API e ligação à base de dados |

Exemplo de transacção:

```json
{
  "revision": 7,
  "changes": [{
    "module": "alunos",
    "kind": "upsert",
    "id": "ALU0021",
    "record": {
      "IdAluno": "ALU0021", "Nome": "Aluno Exemplo",
      "DataNa": "2010-01-15", "Sexo": "M", "Natural": "Bissau",
      "Morada": "Rua Exemplo", "DocN": "DOCUMENTO-21",
      "Encarregado": "Encarregado Exemplo", "Movel1": "955000000",
      "Estado": "Activo"
    }
  }],
  "config": null
}
```

`kind: "delete"` elimina pelo identificador. `upsert` contém o registo completo. Identificadores referenciados não podem ser apagados, excepto nas cascatas explicitamente previstas para alunos e matrículas. A eliminação de um aluno remove inscrições, notas, pagamentos e documentos associados, conforme a confirmação apresentada na interface.

Uma revisão desactualizada recebe **409**; a alteração inteira é recusada. O utilizador deve actualizar a página antes de repetir. Erros de validação recebem **422**, autenticação **401**, permissões **403** e excesso de tentativas de login **429**. As respostas de erro incluem `message`, apresentada na interface sem anunciar sucesso.

## Armazenamento

As 17 colecções escolares têm tabelas próprias `sige_*`, identificador primário, dados JSON que conservam todos os campos dos formulários e colunas relacionais com chaves estrangeiras. Existem restrições únicas para aluno/ano, avaliação/matéria/ano e atribuição turma/matéria/ano. A estrutura está na migração `V1__sige.sql`.

Contas (`sige_users`) guardam hashes BCrypt, nunca palavras-passe em claro. Configurações e revisão partilhada estão em `sige_config`; a auditoria do servidor está em `sige_audit`. A revisão é bloqueada na base durante cada transacção, impedindo que dois clientes substituam dados simultaneamente.

O formato mantém os nomes dos campos do HTML. `Modules.java` define as chaves e relações aceites; os nomes de tabelas não vêm de parâmetros livres. A interface trabalha com uma fotografia dos dados permitidos, adequada à escala de uma escola; paginação no servidor seria uma evolução para volumes muito elevados.

## Permissões

- Administrador: configuração, contas e todos os módulos.
- Director: gestão escolar e financeira, sem acesso às páginas de configurações, escolas, utilizadores ou anos lectivos. A API rejeita alterações a estes módulos e ao ano activo. Os dados institucionais e o catálogo de anos continuam disponíveis para os formulários e impressos autorizados.
- Secretaria: processos, matrículas, turmas, oferta, funcionários, funções e documentos; não altera pagamentos; sem alterar notas.
- Financeiro: altera pagamentos; consulta os módulos de apoio permitidos na interface.
- Professor: recebe apenas alunos/turmas das suas atribuições e notas apenas das suas disciplinas e anos; não recebe notas de outras disciplinas, resultados globais, pagamentos, contactos de alunos, contas, funções ou auditoria. Só altera notas trimestrais das matérias que lecciona. O servidor impõe bloqueios por trimestre e bloqueio administrativo por atribuição.

As médias finais e situações académicas em `resultados` são calculadas no servidor. As médias instantâneas durante o preenchimento são pré-visualizações locais; validação, emissão de documentos de conclusão e renovação usam os resultados confirmados.

## Regras por ano lectivo

`classes[].PorAno[ano]` contém `Inscricao`, `Propina`, `Duracao`, `Valor`, `MaxNegativas`, `NegRecurso` e `NotaRecurso`. O servidor deriva `Valor` como `Propina * Duracao + Inscricao`. Uma classe existente pode ser activada noutro ano acrescentando essa entrada, sem mudar as anteriores. O catálogo é copiado do ano activo quando se cria um ano lectivo.

O workspace inclui `propinas[idInscricao]` (`mesesDevidos`, `devido`, `pago`, `divida`, `mesesEmFalta`, `emDia`) e `elegibilidadeExportacao[idInscricao]`. Esta última liga uma matrícula de destino pendente à matrícula de origem registada em `renovacoes`; avaliações e pagamentos são verificados na origem. O CSV é recalculado pelo servidor no momento do pedido, agrupado por curso/classe/turma, e inclui idades.

A confirmação usa uma transacção que muda `Estado` de `Pendente` para `Matriculado`. Nas renovações, o servidor volta a verificar a elegibilidade e regista `ConfirmadoPor` e `DataConfirmacao`. Alunos pendentes não recebem novas avaliações.

Avaliações trimestrais e notas de exames devem ser inteiras. As médias trimestrais, anuais e finais são arredondadas ao inteiro mais próximo, como no novo HTML. O exame normal tem a sua própria nota e participa na classificação final com o peso configurado; os exames especial, de acesso e de recurso são guardados separadamente.

## Campos e documentos do modelo RGB

O workspace inclui `elegibilidadeDocumentos[idInscricao]`, com `elegivel`, `aprovado` e `semDivida`. O professor não recebe estes resultados. Uma transacção de emissão é validada depois de todas as alterações do lote, impedindo emitir um documento e remover o pagamento necessário na mesma transacção.

Os tipos de documento aceites são `declaracao`, `certificado-freq`, `certificado-conc`, `diploma`, `boletim`, `ficha` e `atestado`; `certificado` continua aceite por compatibilidade. A API regista `CodInscricao`, `Ano`, `Usuario` e `Data`. Todas as emissões pela rubrica oficial exigem elegibilidade; o diploma exige a 12ª classe.

`alunos[].Deficiencias` e `alunos[].AnexosList` são arrays de opções; `Foto` e `config.logo` aceitam `null` ou uma imagem PNG/JPEG em data URL, até 350 000 caracteres. O servidor verifica o conteúdo e rejeita formatos inválidos com 422. Contactos, filiação, dados clínicos e imagens permanecem ausentes da resposta do professor. Consulte [MODELO-RGB.md](MODELO-RGB.md) para a migração dos campos antigos e o uso dos formulários.

## Valores de propinas e cheques

Ao lançar ou editar um pagamento, a API valida o valor segundo a classe e o **ano da matrícula**: propina mensal = `Propina`, trimestral = `Propina × 3`, anual = `Propina × Duracao`; taxa de inscrição = `Inscricao`. O formulário preenche e bloqueia estes valores. As restantes rubricas permitem indicar o montante. Um valor divergente é rejeitado com 422, incluindo quando uma alteração de tarifas consta da mesma transacção. Os recibos históricos não são recalculados ao mudar tarifas.

`FormaPagamento: "Cheque"` exige `NumeroCheque`, texto até 80 caracteres, preservando zeros iniciais. A API remove este campo nas outras formas de pagamento. O número aparece no recibo e na lista de pagamentos individuais.

Os rótulos da interface usam **Cidade**; as chaves existentes `Municipio` e `escolaMunicipio` mantêm-se compatíveis com os dados e backups anteriores.
