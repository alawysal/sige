const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const frontend=process.env.SIGE_TEST_URL||'http://localhost';
const backend=process.env.SIGE_API_URL||'http://localhost:8080';
let browser;
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const [index,base] of [backend,frontend].entries()){
  const specResponse=await fetch(base+'/v3/api-docs');assert.equal(specResponse.status,200);const spec=await specResponse.json();
  assert.equal(Object.keys(spec.paths).length,10);assert.equal(spec.components.securitySchemes.bearerAuth.scheme,'bearer');assert.deepEqual(spec.paths['/api/auth/login'].post.security,[]);
  const yaml=await fetch(base+'/v3/api-docs.yaml');assert.equal(yaml.status,200);assert((await yaml.text()).includes('openapi:'));
  const shortcut=await fetch(base+'/swagger-ui.html',{redirect:'manual'});assert.equal(shortcut.status,302);assert(shortcut.headers.get('location').endsWith('/swagger-ui/index.html'));
  assert.equal((await fetch(base+'/api/workspace')).status,401);
  const context=await browser.newContext({viewport:{width:1440,height:1000}});context.setDefaultTimeout(15000);const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base+'/swagger-ui/index.html');await page.getByRole('heading',{name:/SIGE Guiné-Bissau — API/}).waitFor();
  assert.equal(await page.locator('.opblock').count(),10);
  await page.screenshot({path:'artifacts/swagger-'+(index?'proxy':'backend')+'.png'});
  const login=page.locator('.opblock').filter({has:page.locator('[data-path="/api/auth/login"]')});
  await login.locator('.opblock-summary').click();await login.getByRole('button',{name:'Try it out',exact:true}).click();
  await login.locator('textarea').fill(JSON.stringify({username:process.env.SIGE_TEST_USER||'admin',password:process.env.SIGE_TEST_PASSWORD||'admin123'}));
  const loginResponse=page.waitForResponse(response=>response.url()===base+'/api/auth/login'&&response.request().method()==='POST');
  await login.getByRole('button',{name:'Execute',exact:true}).click();const authenticated=await loginResponse;assert.equal(authenticated.status(),200);const {token}=await authenticated.json();assert(token);
  await login.locator('.opblock-summary').click();
  await page.locator('.auth-wrapper').getByRole('button',{name:/Authorize/}).click();
  const modal=page.locator('.dialog-ux');await modal.locator('input').fill(token);await modal.getByRole('button',{name:'Apply credentials',exact:true}).click();await modal.getByRole('button',{name:'Close',exact:true}).click();
  const workspace=page.locator('.opblock').filter({has:page.locator('[data-path="/api/workspace"]')});
  await workspace.locator('.opblock-summary').click();await workspace.getByRole('button',{name:'Try it out',exact:true}).click();
  const dataResponse=page.waitForResponse(response=>response.url()===base+'/api/workspace');await workspace.getByRole('button',{name:'Execute',exact:true}).click();
  const response=await dataResponse;assert.equal(response.status(),200);const data=await response.json();assert(Number.isInteger(data.revision));assert(Array.isArray(data.alunos));assert(!JSON.stringify(data).includes('"Senha"'));
  assert.deepEqual(errors,[]);await context.close();console.log('Swagger '+(index?'through frontend proxy':'on backend')+': documentation, login, Authorize and authenticated workspace passed.');
 }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
