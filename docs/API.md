# API SIGE

Todas as rotas usam o prefixo `/api`. Excepto login e health, exigem `Authorization: Bearer <token>`. A API verifica a conta activa e a versão da sessão em cada pedido. Uma alteração da conta invalida os tokens anteriores.

| Método | Rota | Função |
|---|---|---|
| POST | `/auth/login` | `{username,password}` → `{token,user}` |
| GET | `/auth/me` | Conta autenticada, sem palavra-passe |
| GET | `/workspace` | Dados permitidos, configurações, resultados e revisão |
| POST | `/transactions` | Alterações atómicas com controlo de revisão |
| POST | `/renewals` | `{revision,origin,destination}` → dados actualizados e `renovadas` |
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
      "DataNa": "2010-01-15", "Sexo": "M", "Natural": "Maputo",
      "Morada": "Rua Exemplo", "DocN": "DOCUMENTO-21",
      "Encarregado": "Encarregado Exemplo", "Movel1": "840000000",
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
- Director: gestão escolar e financeira, sem gerir contas ou parâmetros gerais (pode mudar o ano activo).
- Secretaria: processos, matrículas, turmas, oferta, funcionários, funções, pagamentos e documentos; sem alterar notas.
- Financeiro: altera pagamentos; consulta os módulos de apoio permitidos na interface.
- Professor: recebe apenas alunos/turmas das suas atribuições e não recebe pagamentos, contas, funções ou auditoria. Só altera notas trimestrais das matérias que lecciona. O servidor impõe bloqueios por trimestre e bloqueio administrativo por atribuição.

As médias finais e situações académicas em `resultados` são calculadas no servidor. As médias instantâneas durante o preenchimento são pré-visualizações locais; validação, emissão de documentos de conclusão e renovação usam os resultados confirmados.
