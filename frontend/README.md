# Frontend SIGE Guiné-Bissau

Angular 16 e Bootstrap 5, com o design de `../SIGE_RGB.html` preservado.

```bash
npm ci
npm start
```

Abra `http://localhost:4201/sige`. O backend deve estar disponível na porta 8080; `proxy.conf.json` encaminha os pedidos `/api` e a documentação Swagger. Em desenvolvimento, abra `http://localhost:4201/swagger-ui/index.html`; em Docker, `http://localhost/swagger-ui/index.html`.

```bash
npm run build
npm test
npm run test:unit
```

A sessão e as chamadas à API estão em `src/app/core`. O componente principal contém o login e a estrutura de navegação Angular. As 29 vistas e os impressos são gerados do HTML original por `../scripts/build-promax.cjs`, com eventos convertidos em callbacks e gravações confirmadas pelo servidor.

Para regenerar, execute `node scripts/build-promax.cjs` na raiz do projecto. Não edite directamente `src/app/promax/promax-renderer.js`; altere o gerador ou os adaptadores `scripts/school-adaptations.cjs`, `scripts/rgb-adaptations.cjs`, `scripts/rgb-runtime.js` e `scripts/renderer-*.js`.

Consulte [o README principal](../README.md) para Docker, credenciais de demonstração, permissões e configuração MySQL.

O [fluxo de dados](../docs/FLUXO-DADOS.md) descreve as gravações transaccionais, as revisões e a verificação de alterações entre os formulários, a API e o MySQL.
