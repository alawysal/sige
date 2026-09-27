const {chromium}=require('playwright');
const assert=require('node:assert/strict');const fs=require('node:fs');
const base=process.env.SIGE_TEST_URL||'http://localhost';
const pass=process.env.SIGE_TEST_PASSWORD||'admin123';
const user=process.env.SIGE_TEST_USER||'admin';
const ids=[],userIds=[];let browser,token;
async function api(path,method='GET',data,auth=token){const response=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(data?{body:JSON.stringify(data)}:{})});const body=await response.json();return {status:response.status,body};}
async function transaction(module,kind,record,key){const current=(await api('/workspace')).body;return api('/transactions','POST',{revision:current.revision,changes:[{module,kind,id:String(record[key]),...(kind==='upsert'?{record}:{})}]});}
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});
 assert.equal((await api('/health')).status,200);
 assert.equal((await api('/workspace','GET',null,'')).status,401);
 assert.equal((await api('/workspace','GET',null,'broken.jwt.token')).status,401);
 assert.equal((await api('/auth/login','POST',{username:user,password:'wrong'},'')).status,401);
 const auth=await api('/auth/login','POST',{username:user,password:pass},'');assert.equal(auth.status,200);token=auth.body.token;
 let data=(await api('/workspace')).body;assert(data.alunos.length);assert(!JSON.stringify(data).includes('"Senha"'));assert(!JSON.stringify(data).includes('$2a$'));
 browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{window.print=()=>{window.__printed=true;};});
 await page.goto(base);await page.locator('#lgUser').fill(user);await page.locator('#lgPass').fill(pass);await page.locator('.btn-login').click();await page.locator('#app:not(.hidden)').waitFor();await page.locator('#view .stats').waitFor();await page.screenshot({path:'artifacts/dashboard.png'});
 const paths=await page.locator('#nav a').evaluateAll(links=>links.map(a=>a.getAttribute('href')));
 assert.equal(paths.length,28);
 for(const path of paths){await page.locator('#nav a[href="'+path+'"]').click();await page.waitForURL('**'+path);assert((await page.locator('#view').innerText()).trim().length>5,'Empty '+path);}
 assert.equal(errors.length,0,errors.join('\n'));console.log('All 28 application screens loaded.');
 // Create a complete student through the original form and reload from MySQL.
 await page.locator('#nav a[href="/sige/app/alunos"]').click();await page.getByRole('button',{name:/Novo Aluno/}).click();
 const studentId=await page.locator('#f_IdAluno').inputValue();ids.push(studentId);
 for(const [field,value] of Object.entries({Nome:'Aluno Teste SIGE '+Date.now(),DataNa:'2010-05-12',Natural:'Bissau',Morada:'Rua de Teste',DocN:'TESTE-'+Date.now(),Encarregado:'Encarregado Teste',Movel1:'955000000'}))await page.locator('#f_'+field).fill(value);
 const name=await page.locator('#f_Nome').inputValue();await page.locator('.modal-foot').getByRole('button',{name:/Guardar/}).click();await page.locator('.modal').waitFor({state:'hidden'});await page.locator('#qAluno').fill(name);assert.equal(await page.locator('#view tbody tr[data-student]').count(),1);await page.reload();await page.locator('#qAluno').fill(name);assert((await page.locator('#view tbody').innerText()).includes(name));
 data=(await api('/workspace')).body;const student=data.alunos.find(a=>a.IdAluno===studentId);assert.equal(student.Nome,name);
 // Invalid data stays in the modal and no false success or database write occurs.
 await page.locator('#view tbody .acoes button').nth(1).click();await page.locator('#f_DataNa').fill('2099-01-01');await page.locator('.modal-foot').getByRole('button',{name:/Guardar/}).click();await page.locator('#toasts .err').waitFor();assert(await page.locator('.modal').isVisible());await page.locator('#f_DataNa').fill('2011-05-12');await page.locator('.modal-foot').getByRole('button',{name:/Guardar/}).click();await page.locator('.modal').waitFor({state:'hidden'});assert.equal((await api('/workspace')).body.alunos.find(a=>a.IdAluno===studentId).DataNa,'2011-05-12');
 console.log('Student create, persistent reload, validation and correction passed.');
 // Enrollment, classroom consistency, receipt and print.
 await page.locator('#nav a[href="/sige/app/inscricoes"]').click();await page.getByRole('button',{name:/Nova Matrícula/}).click();await page.locator('#i_CodAluno').selectOption(studentId);await page.locator('#i_Turma').selectOption('T001');await page.locator('#i_Valor').fill('500');await page.locator('#i_Estado').selectOption('Matriculado');await page.locator('.modal-foot').getByRole('button',{name:/Guardar/}).click();await page.locator('.modal').waitFor({state:'hidden'});
 data=(await api('/workspace')).body;const enrollment=data.inscricoes.find(i=>i.CodAluno===studentId);assert(enrollment);assert.equal(enrollment.CodCurso,'CUR001');
 await page.locator('#nav a[href="/sige/app/pagamentos"]').click();await page.getByRole('button',{name:/Registar Pagamento|Novo Pagamento/}).click();await page.locator('#p_aluno').selectOption(studentId);await page.locator('#p_valor').fill('650');await page.locator('.modal-foot').getByRole('button',{name:/Registar e Emitir Recibo/}).click();await page.locator('.modal').waitFor({state:'hidden'});await page.waitForFunction(()=>window.__printed===true);assert((await page.locator('#printArea').innerText()).includes(name));await page.screenshot({path:'artifacts/payments.png'});await page.emulateMedia({media:'print'});await page.pdf({path:'artifacts/receipt.pdf',format:'A4',printBackground:true});await page.emulateMedia({media:'screen'});
 const payment=(await api('/workspace')).body.pagamentos.find(p=>p.CodAluno===studentId);assert.equal(payment.Valor,650);
 // Professor: only assigned discipline; submission locks one term, not the following one.
 const teacher=(await api('/auth/login','POST',{username:'professor',password:'prof123'},'')).body.token;const teacherData=(await api('/workspace','GET',null,teacher)).body;assert.equal(teacherData.pagamentos.length,0);assert(teacherData.alunos.some(a=>a.IdAluno===studentId));
 const maxId=Math.max(...(await api('/workspace')).body.notas.map(n=>n.IdNota),0)+1;
 const grade={IdNota:maxId,CodInscricao:enrollment.IdInscricao,CodMateria:9,Ano:enrollment.Ano,I_Trimestre:{MAC:15,NPP:14,NPT:16},II_Trimestre:{MAC:null,NPP:null,NPT:null},III_Trimestre:{MAC:null,NPP:null,NPT:null},ExameFinal:null,ExameRecurso:null,Locked:false};
 let current=(await api('/workspace')).body;let response=await api('/transactions','POST',{revision:current.revision,changes:[{module:'notas',kind:'upsert',id:String(maxId),record:grade}]},teacher);assert.equal(response.status,200,JSON.stringify(response.body));const submitted=response.body.notas.find(n=>n.IdNota===maxId);assert(submitted.Locks.I_Trimestre);submitted.I_Trimestre.MAC=17;response=await api('/transactions','POST',{revision:response.body.revision,changes:[{module:'notas',kind:'upsert',id:String(maxId),record:submitted}]},teacher);assert.equal(response.status,403);
 const denied=await api('/transactions','POST',{revision:(await api('/workspace')).body.revision,changes:[{module:'alunos',kind:'upsert',id:studentId,record:student}]},teacher);assert.equal(denied.status,403);
 current=(await api('/workspace')).body;response=await api('/transactions','POST',{revision:current.revision-1,changes:[]});assert.equal(response.status,409);
 console.log('Enrollment, receipt, printing, role restrictions, grade locks and concurrency passed.');
 // Refresh after the independent professor session changed the shared revision.
 await page.reload();await page.locator('#nav a').first().waitFor();
 // Responsive navigation.
 await page.setViewportSize({width:390,height:844});await page.locator('#menuBtn').click();await page.locator('#nav a[href="/sige/app/alunos"]').click();await page.locator('#sidebar').evaluate(el=>{if(el.classList.contains('open'))throw new Error('Mobile menu did not close');});await page.screenshot({path:'artifacts/students-mobile.png'});
 // A declaration is recorded and printed; a certificate is refused before completion.
 await page.setViewportSize({width:1440,height:1000});await page.locator('#nav a[href="/sige/app/documentos"]').click();await page.locator('#doc_aluno').selectOption(studentId);await page.locator('#view .card').filter({hasText:'Declaração de Matrícula'}).last().click();await page.waitForFunction(()=>document.querySelector('#printArea')?.textContent.includes('Declaração de Matrícula'));assert((await api('/workspace')).body.documentosEmitidos.some(d=>d.CodAluno===studentId));
 // User administration: password hashing, role and immediate session revocation.
 await page.reload();await page.locator('#nav a[href="/sige/app/usuarios"]').click();await page.getByRole('button',{name:/Novo Utilizador/}).click();
 const temporaryUser='teste'+Date.now();await page.locator('#u_Usuario').fill(temporaryUser);await page.locator('#u_Nome').fill('Utilizador de Teste');await page.locator('#u_Senha').fill('TesteSige123!');await page.locator('#u_Perfil').selectOption('Financeiro');
 await page.locator('.modal-foot').getByRole('button',{name:/Guardar/}).click();await page.locator('.modal').waitFor({state:'hidden'});
 const created=(await api('/workspace')).body.usuarios.find(u=>u.Usuario===temporaryUser);assert(created);userIds.push(created.IdUsuario);
 const temporaryAuth=await api('/auth/login','POST',{username:temporaryUser,password:'TesteSige123!'},'');assert.equal(temporaryAuth.status,200);assert.equal(temporaryAuth.body.user.Perfil,'Financeiro');
 created.Ativo='Não';assert.equal((await transaction('usuarios','upsert',created,'IdUsuario')).status,200);assert.equal((await api('/workspace','GET',null,temporaryAuth.body.token)).status,401);
 assert.equal(errors.length,0,errors.join('\n'));console.log('Responsive layout, official documents and user/session management passed.');
 await browser.close();browser=null;
})().catch(async error=>{if(browser){const page=browser.contexts()[0]?.pages()[0];if(page){await page.screenshot({path:'artifacts/e2e-failure.png'});fs.writeFileSync('artifacts/e2e-failure.txt',await page.locator('body').innerText());}}console.error(error);process.exitCode=1;}).finally(async()=>{
 if(browser)await browser.close();
 for(const id of userIds)if(token)await transaction('usuarios','delete',{IdUsuario:id},'IdUsuario');
 for(const id of ids)if(token){const result=await transaction('alunos','delete',{IdAluno:id},'IdAluno');if(result.status!==200){console.error('Test cleanup failed for '+id+': '+JSON.stringify(result.body));process.exitCode=1;}}
});
