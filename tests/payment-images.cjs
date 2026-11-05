const {chromium}=require('playwright'),{PNG}=require('pngjs'),assert=require('node:assert/strict'),fs=require('node:fs'),{execFileSync}=require('node:child_process');
const base=process.env.SIGE_TEST_URL||'http://localhost',id='EDIT'+Date.now();let browser,token,originalLogo,testLogo;
async function api(path,method='GET',body,auth=token){const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};}
async function db(){const r=await api('/workspace');assert.equal(r.status,200);return r.body;}
async function tx(changes,config){const data=await db(),r=await api('/transactions','POST',{revision:data.revision,changes,config});assert.equal(r.status,200,JSON.stringify(r.body));return r.body;}
const up=(module,key,record)=>({module,kind:'upsert',id:String(record[key]),record});
const sql=s=>execFileSync('docker',['compose','exec','-T','mysql','sh','-c','MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 --batch --skip-column-names -u"$MYSQL_USER" "$MYSQL_DATABASE"'],{input:s+';\n',encoding:'utf8'}).trim();
const image=(r,g,b)=>{const png=new PNG({width:96,height:96});for(let i=0;i<png.data.length;i+=4){png.data[i]=r;png.data[i+1]=g;png.data[i+2]=b;png.data[i+3]=255;}return {name:'imagem.png',mimeType:'image/png',buffer:PNG.sync.write(png)};};
const blue=image(15,110,145),gold=image(205,160,30);
async function login(page,user,password){await page.goto(base+'/sige');await page.locator('#lgUser').fill(user);await page.locator('#lgPass').fill(password);await page.locator('.btn-login').click();await page.waitForURL('**/sige/app/dashboard');}
async function idle(page){await page.locator('.sync-cover').waitFor({state:'hidden'});}
async function upload(page,selector,file){const chooser=page.waitForEvent('filechooser');await page.locator(selector).click();await (await chooser).setFiles(file);await idle(page);}
async function calendar(page,selector){
 const input=page.locator(selector),before=await input.inputValue();
 await input.click({position:{x:24,y:16}});await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
 const after=await input.inputValue();assert.match(after,/^\d{4}-\d{2}-\d{2}$/);assert.notEqual(after,before,'Calendar selection must change '+selector);
 const clicked=await page.evaluate(id=>window.dateClicks.filter(e=>e.id===id).at(-1),selector.slice(1));assert(clicked&&!clicked.cancelled,'Native date click was cancelled: '+selector);
 assert.equal(await page.locator('.sync-cover').count(),0);assert(await page.locator('.modal').isVisible());
}
(async()=>{
 fs.mkdirSync('artifacts',{recursive:true});token=(await api('/auth/login','POST',{username:'admin',password:'admin123'})).body.token;
 let data=await db();originalLogo=data.config.logo;const year=data.config.anoActivo,future=data.anosLectivos.map(y=>y.Ano).filter(y=>y>year).sort()[0];assert(future);
 const student={...data.alunos[0],IdAluno:id,Nome:'Teste Edição '+id,Foto:null,DataNa:'2010-05-12'};
 const source=data.inscricoes.find(i=>i.Ano===year&&i.Estado==='Matriculado');
 const room={...data.turmas.find(t=>t.CodTurma===source.CodTurma),CodTurma:id,Ano:future,Turma:'Teste',Capacidade:40};
 const insId=Math.max(...data.inscricoes.map(i=>i.IdInscricao))+1;
 const enrollment={...source,IdInscricao:insId,CodAluno:id,NumMatricula:id};
 const futureEnrollment={...enrollment,IdInscricao:insId+1,Ano:future,Classe:room.Classe,CodCurso:room.Curso,Curso:room.Curso,CodTurma:room.CodTurma,Turma:room.Turma,Turno:room.Turno,NumMatricula:id+'F'};
 data=await tx([up('turmas','CodTurma',room),up('alunos','IdAluno',student),up('inscricoes','IdInscricao',enrollment),up('inscricoes','IdInscricao',futureEnrollment)]);
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.print=()=>{};window.dateClicks=[];document.addEventListener('click',e=>{if(e.target.matches('input[type="date"]'))window.dateClicks.push({id:e.target.id,cancelled:e.defaultPrevented});});});
 await login(page,'admin','admin123');const nav=view=>page.locator('#nav a[href="/sige/app/'+view+'"]').click();
 const edit=async()=>{await nav('alunos');await page.locator('#qAluno').fill(student.Nome);await page.locator('#view tbody .acoes button').nth(1).click();};
 const save=async()=>{await page.locator('.modal-foot').getByRole('button',{name:/Guardar/}).click();await page.locator('.modal').waitFor({state:'hidden'});};
 await edit();await calendar(page,'#f_DataNa');await page.locator('#f_DataNa').fill(student.DataNa);
 await upload(page,'#prevFotoBox',blue);const first=await page.locator('#prevFoto').getAttribute('src');await save();assert.equal((await db()).alunos.find(a=>a.IdAluno===id).Foto,first);
 await edit();await upload(page,'#prevFotoBox',gold);const second=await page.locator('#prevFoto').getAttribute('src');assert.notEqual(first,second);await page.locator('.modal-foot').getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal((await db()).alunos.find(a=>a.IdAluno===id).Foto,first);
 await edit();await upload(page,'#prevFotoBox',gold);await save();await page.reload();await edit();assert.equal(await page.locator('#prevFoto').getAttribute('src'),second);
 await page.getByRole('button',{name:'🗑 Remover',exact:true}).click();assert.equal(await page.locator('#prevFoto').count(),0);await upload(page,'#prevFotoBox',gold);assert.equal(await page.locator('#prevFoto').getAttribute('src'),second);await page.getByRole('button',{name:'🗑 Remover',exact:true}).click();await save();assert.equal((await db()).alunos.find(a=>a.IdAluno===id).Foto,null);
 console.log('Photo: native chooser, upload, replacement, cancellation, removal, same-file reselection and reload passed.');
 await nav('inscricoes');await page.getByRole('button',{name:/Nova Matrícula/}).click();await calendar(page,'#i_Data');await page.locator('.modal-foot').getByRole('button',{name:'Cancelar',exact:true}).click();
 await nav('pagamentos');await page.getByRole('button',{name:/Registar Pagamento/}).click();await page.locator('#p_aluno').selectOption(id);await calendar(page,'#p_data');await page.locator('#p_data').fill(new Date().toISOString().slice(0,10));
 const tariff=data.classes.find(c=>c.Classe===enrollment.Classe).PorAno[year];
 for(const [type,amount] of [['Propina Mensal',tariff.Propina],['Propina Trimestral',tariff.Propina*3],['Propina Anual',tariff.Propina*tariff.Duracao],['Taxa de Inscrição',tariff.Inscricao]]){await page.locator('#p_ref').selectOption(type);assert.equal(Number(await page.locator('#p_valor').inputValue()),amount);assert(await page.locator('#p_valor').evaluate(e=>e.readOnly));}
 await page.locator('#p_ref').selectOption('Outro');assert(!(await page.locator('#p_valor').evaluate(e=>e.readOnly)));await page.locator('#p_valor').fill('1234');await page.locator('#p_ref').selectOption('Propina Trimestral');assert.equal(Number(await page.locator('#p_valor').inputValue()),tariff.Propina*3);
 await page.locator('#p_forma').selectOption('Cheque');await page.locator('.modal-foot').getByRole('button',{name:/Registar/}).click();assert(await page.locator('.modal').isVisible());assert.equal((await db()).pagamentos.filter(p=>p.CodAluno===id).length,0);
 await page.locator('#p_cheque').fill('00012345');await page.locator('#p_forma').selectOption('Numerário');assert(await page.locator('#p_cheque_campo').isHidden());await page.locator('#p_forma').selectOption('Cheque');assert.equal(await page.locator('#p_cheque').inputValue(),'');await page.locator('#p_cheque').fill('00012345');
 await page.screenshot({path:'artifacts/payment-cheque-form.png'});await page.locator('.modal-foot').getByRole('button',{name:/Registar/}).click();await page.locator('.modal').waitFor({state:'hidden'});await page.waitForFunction(()=>document.querySelector('#printArea').textContent.includes('00012345'));
 const payment=(await db()).pagamentos.find(p=>p.CodAluno===id);assert.equal(payment.Valor,tariff.Propina*3);assert.equal(payment.NumeroCheque,'00012345');assert.equal(sql("SELECT JSON_UNQUOTE(JSON_EXTRACT(data, '$.NumeroCheque')) FROM sige_pagamentos WHERE id='"+payment.IdPagamento+"'"),'00012345');
 await page.locator('#pg_aluno').selectOption(id);await page.getByRole('button',{name:'🖨 Lista de Pagamentos',exact:true}).click();assert((await page.locator('#printArea').innerText()).includes('00012345'));
 await page.reload();await page.locator('#pg_ano').selectOption(future);await page.getByRole('button',{name:/Registar Pagamento/}).click();await page.locator('#p_aluno').selectOption(id);await page.locator('#p_ref').selectOption('Propina Anual');const futureTariff=data.classes.find(c=>c.Classe===futureEnrollment.Classe).PorAno[future];assert.equal(Number(await page.locator('#p_valor').inputValue()),futureTariff.Propina*futureTariff.Duracao);await page.locator('.modal-foot').getByRole('button',{name:'Cancelar',exact:true}).click();
 assert((await page.evaluate(()=>window.dateClicks)).every(e=>!e.cancelled));console.log('Native calendars, annual tuition calculations, cheque validation, receipt/list and MySQL persistence passed.');
 await nav('config');assert(/cidade/i.test(await page.locator('#view').innerText()));assert(!/município/i.test(await page.locator('#view').innerText()));await page.locator('#cfg_escolaNome').fill('Rascunho por guardar');
 await upload(page,'button[data-sige-click]:has-text("Carregar")',blue);testLogo=(await db()).config.logo;assert.equal(await page.locator('#logoPrev img').getAttribute('src'),testLogo);assert.equal(await page.locator('#cfg_escolaNome').inputValue(),'Rascunho por guardar');assert.equal((await db()).config.escolaNome,data.config.escolaNome);
 await upload(page,'button[data-sige-click]:has-text("Carregar")',gold);const replacement=(await db()).config.logo;assert.notEqual(replacement,testLogo);testLogo=replacement;await page.reload();assert.equal(await page.locator('#brandLogo img').getAttribute('src'),testLogo);
 await page.getByRole('button',{name:'🗑 Remover',exact:true}).click();await idle(page);testLogo=null;assert.equal((await db()).config.logo,null);await upload(page,'button[data-sige-click]:has-text("Carregar")',gold);testLogo=(await db()).config.logo;assert.equal(testLogo,replacement);
 await nav('escolas');assert(/cidade/i.test(await page.locator('#view').innerText()));assert(!/município/i.test(await page.locator('#view').innerText()));
 console.log('Logo replacement/removal/reselection persisted; unsaved school fields preserved; Cidade displayed.');
 const director=await browser.newPage();director.setDefaultTimeout(15000);await login(director,'diretor','dir123');
 for(const view of ['config','escolas','usuarios','anos-lectivos']){assert.equal(await director.locator('#nav a[href="/sige/app/'+view+'"]').count(),0);await director.goto(base+'/sige/app/'+view);await director.waitForURL('**/sige/app/dashboard');}
 const directorToken=(await api('/auth/login','POST',{username:'diretor',password:'dir123'})).body.token;data=await db();
 for(const changes of [[up('escolas','CodEscola',data.escolas[0])],[up('anosLectivos','Ano',data.anosLectivos[0])]])assert.equal((await api('/transactions','POST',{revision:data.revision,changes},directorToken)).status,403);
 assert.equal((await api('/transactions','POST',{revision:data.revision,changes:[],config:{...data.config,anoActivo:future}},directorToken)).status,403);assert.deepEqual(errors,[]);
 console.log('Director denied all configuration pages and API changes, including active-year changes.');
})().catch(async e=>{console.error(e);process.exitCode=1;if(browser){const page=browser.contexts()[0]?.pages()[0];if(page){await page.screenshot({path:'artifacts/payment-images-failure.png'});fs.writeFileSync('artifacts/payment-images-failure.txt',await page.locator('body').innerText());}}}).finally(async()=>{
 if(browser)await browser.close();if(!token)return;const data=await db(),changes=[];if(data.alunos.some(a=>a.IdAluno===id))changes.push({module:'alunos',kind:'delete',id});if(data.turmas.some(t=>t.CodTurma===id))changes.push({module:'turmas',kind:'delete',id});let config;
 if(testLogo!==undefined&&data.config.logo===testLogo)config={...data.config,logo:originalLogo||null};
 if(changes.length||config)await tx(changes,config);console.log('Temporary student/enrollments/payments removed; original logo restored.');
});
