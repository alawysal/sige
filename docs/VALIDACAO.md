# Validação da implementação

Verificação concluída em 27 de Setembro de 2026, com Angular servido pelo Nginx, API Spring Boot e MySQL em Docker.

| Verificação | Resultado |
|---|---|
| Build de produção Angular | Passou |
| Integridade das 25 vistas e preservação do CSS original | Passou |
| Teste do componente Angular: rejeição de autenticação | 1 teste passou |
| Backend: regras escolares, permissões, concorrência e renovações | 10 testes passaram; sem falhas ou erros |
| Navegador: navegação pelos 25 módulos | Passou; sem erros JavaScript detectados |
| Alunos: criação, edição, validação e leitura após recarregar | Passou |
| Matrículas, pagamentos, recibos e impressão PDF | Passou |
| Professor: restrições de avaliação e bloqueio por trimestre | Passou |
| Alterações concorrentes com revisão desactualizada | Rejeitadas com HTTP 409 |
| Documentos, criação de utilizador e invalidação de sessão ao desactivar a conta | Passou |
| Navegação em ecrã móvel | Passou |
| Persistência após reiniciar MySQL, backend e frontend | Confirmada; registo temporário removido |
| Estado final dos três serviços Docker | `healthy` |

## Comparação com o HTML original

Em Chrome, com janela de 1440 × 1000, a comparação automatizada do login e do painel apresentou **0,000% de diferenças detectadas** segundo a tolerância de cor do teste. As dimensões e a posição do formulário de aluno coincidiram com a referência após terminar a animação. Foram também capturados ecrãs móveis.

Esta comparação cobre estes ecrãs; não constitui uma comparação visual exaustiva dos 25 módulos. A navegação pelos 25 módulos e os fluxos acima foram verificados separadamente.

As capturas e o recibo PDF encontram-se em `artifacts/`. Os scripts estão em `tests/e2e.cjs`, `tests/visual.cjs` e `tests/persistence.cjs`. Os dados criados pelos testes integrados foram removidos, mantendo o histórico de auditoria das operações.

## Repetir as verificações adicionais

Os comandos principais de build e testes estão no [README](../README.md#desenvolvimento-e-testes). Os testes de navegador requerem Node 20, Chrome e as dependências instaladas com `npm ci --prefix tests`.

Para comparar com a referência, use os dados de demonstração e a API na porta 8080. Depois do build Angular, inicie o servidor de comparação numa porta 4201 livre:

```bash
node tests/preview-server.cjs
```

Noutro terminal:

```bash
node tests/visual.cjs
```

Para verificar a persistência, com a stack de demonstração em execução, execute os comandos pela ordem indicada. O reinício interrompe brevemente o acesso à aplicação. O último comando confirma a existência do registo e remove-o:

```bash
node tests/persistence.cjs create
docker compose restart mysql backend frontend
docker compose up -d --wait --wait-timeout 120
node tests/persistence.cjs verify
```
