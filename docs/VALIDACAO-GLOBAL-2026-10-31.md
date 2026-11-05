# Validação global — 31 de Outubro de 2026

Aplicação executada no Docker Desktop com MySQL, Spring Boot e Nginx. Serviços deixados em execução em http://localhost/sige.

| Verificação | Resultado |
|---|---|
| Backend em Java 17, Maven verify | 48 testes; zero falhas ou erros |
| Angular em Chrome Headless | 3 testes; zero falhas |
| Renderizador e integridade das 29 vistas | Passou, incluindo pesquisa do Ministério e histórico escolar |
| Compilação de produção no Docker | Passou |
| e2e | Passou: 29 módulos, aluno, matrícula, pagamento, MySQL, permissões, concorrência e menu móvel |
| school-rules | Passou: tarifas, exames, perfis, relatórios e redirecionamentos |
| rgb-features | Passou: fotografias, documentos oficiais, certificados, diplomas e listas por turma |
| payment-images | Passou: calendários, imagens, logotipo, cálculos e cheques |
| schools | Passou: isolamento entre escolas, rascunhos, validação de notas e pesquisa do Ministério |
| swagger | Passou: contrato, autenticação e pedidos pela API e pelo Nginx |
| Persistência após reiniciar os três serviços | Passou; tarifas e registo temporário persistiram; registo de teste removido |

A verificação do Ministério cobre pesquisa por nome e número de processo, filtro de escola, consulta sem edição e histórico com nome da disciplina, ano e aprovação. As seis suites foram executadas sequencialmente; após as correcções repetiram-se as suites afectadas. O resultado mais recente de cada suite e os respectivos logs estão em `artifacts/global-results.json` e `artifacts/global-*.log`.

As contagens antes e depois da validação coincidem: **20 alunos, 21 matrículas, 23 pagamentos e 8 contas**. O teste de escolas também compara os registos existentes antes e depois de remover os seus dados temporários. O volume MySQL foi preservado.

## Correcções realizadas durante a validação

- Reposição da execução das migrações Flyway, usando a tabela existente `sige_schema_history`, JDBC no backend e H2 apenas nos testes.
- Proxy Nginx com o prefixo `/api` preservado, Swagger acessível e redirecionamento de `/` para `/sige`.
- Redirecionamento para o painel quando se abre directamente um módulo sem permissão.
- Menu móvel ligado ao botão de abertura e logotipo da escola apresentado no menu.
- Recriação do renderizador ao mudar de escola, evitando resultados da selecção anterior.
- Histórico escolar com o campo real `Materia` para os nomes das disciplinas.
- Testes ajustados ao ano da matrícula e com disciplinas temporárias, sem exigir alterações ao ano activo ou às atribuições existentes.

## Limpeza

Removidos cerca de 1 GB de caches antigos do Angular/IDE, caches regenerados durante os testes e diagnósticos das tentativas falhadas. `backend.zip` e `projeto-escolar/backend.tgz` foram removidos porque continham respostas JSON de erro de um download, não arquivos válidos. Mantidos os ficheiros de referência, SQL, código preservado, dependências instaladas, backups e volume MySQL.

## Repetir

Com Node 20, Chrome e a stack Docker em execução:

```bash
mvn -f backend/pom.xml verify
node tests/renderer.test.cjs
npm test --prefix frontend -- --watch=false --browsers=ChromeHeadless
npm run test:global --prefix tests
```

É possível repetir uma suite específica com `node tests/global.cjs schools`; o relatório conserva os resultados anteriores das outras suites.

A compilação mantém avisos de tamanho do bundle inicial (cerca de 556 kB) e do CSS do componente (cerca de 10 kB), sem impedir o build.
