const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base=process.env.SIGE_TEST_URL||'http://localhost';
let browser,token,createdClass;
async function api(path,method='GET',body){const response=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};}
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});
 token=(await api('/auth/login','POST',{username:'admin',password:'admin123'})).body.token;
 browser=await chromium.launch({channel:'chrome',headless:true});
 const errors=[];
 async function login(user,password){const context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.print=()=>{};});await page.goto(base+'/sige');await page.locator('#lgUser').fill(user);await page.locator('#lgPass').fill(password);await page.locator('.btn-login').click();await page.waitForURL('**/sige/app/dashboard');return page;}
 const admin=await login('admin','admin123');
 await admin.locator('#nav a[href="/sige/app/classes"]').click();
 await admin.locator('#c_ano').selectOption('2027/2028');
 await admin.getByRole('button',{name:/Nova Classe/}).click();
 const className='Classe TESTE '+Date.now();
 await admin.locator('#c_Classe').fill(className);await admin.locator('#c_Propina').fill('6500');await admin.locator('#c_Duracao').fill('10');await admin.locator('#c_Inscricao').fill('5000');
 assert.equal(await admin.locator('#c_Valor').inputValue(),'70000');
 await admin.locator('.modal-foot').getByRole('button',{name:/Guardar/}).click();await admin.locator('.modal').waitFor({state:'hidden'});
 let db=(await api('/workspace')).body;createdClass=db.classes.find(c=>c.Classe===className)?.IdClasse;assert(createdClass);
 assert.equal(db.classes.find(c=>c.IdClasse===createdClass).PorAno['2027/2028'].Valor,70000);
 assert(!db.classes.find(c=>c.IdClasse===createdClass).PorAno['2026/2027']);
 await admin.screenshot({path:'artifacts/annual-classes.png'});
 await admin.locator('#c_ano').selectOption('2026/2027');assert.equal(await admin.locator('#view tbody').getByText(className,{exact:true}).count(),0);
 console.log('Annual class form: total formula and separation by year verified.');
 await admin.locator('#nav a[href="/sige/app/exames-finais"]').click();await admin.locator('#e_tipo').selectOption('Exame Especial');
 const firstExam=admin.locator('#areaExames .nota-input').first(),examRow=firstExam.locator('xpath=ancestor::tr');
 const originalFinal=await examRow.locator('.media-cell').innerText();await firstExam.fill('20');assert.equal(await examRow.locator('.media-cell').innerText(),originalFinal,'Special exam preview must not replace the normal exam');
 console.log('Independent exam preview verified without changing saved grades.');
 const secretary=await login('secretaria','sec123');
 assert.equal(await secretary.locator('#nav a[href="/sige/app/pagamentos"]').count(),0);
 await secretary.goto(base+'/sige/app/pagamentos');await secretary.waitForURL('**/sige/app/dashboard');
 await secretary.locator('#nav a[href="/sige/app/alunos"]').click();assert(await secretary.locator('#view .sige-group').count()>0);
 const header=await secretary.locator('#view thead').innerText();assert(/Idade/i.test(header));assert(!/Encarregado|Contacto|Morada|Nascimento/i.test(header));
 await secretary.getByRole('button',{name:'🖨 Imprimir',exact:true}).click();
 const nominal=await secretary.locator('#printArea').innerText();assert(/Lista Nominal/i.test(nominal));assert(/Idade/i.test(nominal));assert(!/Encarregado|Morada|Telemóvel|Nascimento/i.test(nominal));
 await secretary.locator('#nav a[href="/sige/app/exportar"]').click();await secretary.locator('#ex_ano').selectOption('2027/2028');
 const download=secretary.waitForEvent('download');await secretary.getByRole('button',{name:/CSV/}).click();await (await download).saveAs('artifacts/eligible-renewals.csv');
 assert(!/Encarregado|Morada|Movel1|DataNa/.test(fs.readFileSync('artifacts/eligible-renewals.csv','utf8')));
 await secretary.locator('#nav a[href="/sige/app/dividas-turma"]').click();await secretary.screenshot({path:'artifacts/debts-by-class.png'});
 const finance=await login('financeiro','fin123');
 for(const view of ['alunos','inscricoes']){assert.equal(await finance.locator('#nav a[href="/sige/app/'+view+'"]').count(),0);await finance.goto(base+'/sige/app/'+view);await finance.waitForURL('**/sige/app/dashboard');}
 console.log('Secretary and finance privileges, grouped nominal lists and restricted export verified.');
 const teacher=await login('professor','prof123');
 for(const view of ['pautas','boletins','pagamentos'])assert.equal(await teacher.locator('#nav a[href="/sige/app/'+view+'"]').count(),0);
 await teacher.goto(base+'/sige/app/boletins');await teacher.waitForURL('**/sige/app/dashboard');
 await teacher.locator('#nav a[href="/sige/app/ficha-avaliacao"]').click();await teacher.getByRole('button',{name:/Imprimir/}).click();assert((await teacher.locator('#printArea').innerText()).includes('Ficha de Avaliação'));
 await teacher.screenshot({path:'artifacts/teacher-assessment.png'});
 await teacher.locator('#nav a[href="/sige/app/notas"]').click();
 const editable=teacher.locator('#areaNotas .nota-input:not(:disabled)');
 if(await editable.count()){await editable.first().fill('14.5');await teacher.locator('#toasts .err').filter({hasText:/inteira/}).waitFor();assert.equal(await editable.first().inputValue(),'14.5');await teacher.reload();}
 assert.deepEqual(errors,[]);console.log('Teacher assessment sheet, blocked report routes and integer grade validation verified.');
 const root=await fetch(base,{redirect:'manual'});assert.equal(root.status,302);assert(root.headers.get('location').endsWith('/sige'));
})().catch(async error=>{console.error(error);if(browser){for(const [index,context] of browser.contexts().entries()){const page=context.pages()[0];if(page){await page.screenshot({path:'artifacts/rules-failure-'+index+'.png'});fs.writeFileSync('artifacts/rules-failure-'+index+'.txt',await page.locator('body').innerText());}}}process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();
 if(createdClass){const db=(await api('/workspace')).body;const result=await api('/transactions','POST',{revision:db.revision,changes:[{module:'classes',kind:'delete',id:String(createdClass)}]});assert.equal(result.status,200,JSON.stringify(result.body));}
});
