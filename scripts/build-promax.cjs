/* Converts the reference's trusted event expressions to closures at build time.
   The application never evaluates HTML event text, uses an iframe, or stores school records in the browser. */
const fs=require('fs');const ts=require('../frontend/node_modules/typescript');const vm=require('vm');
const html=fs.readFileSync('000_form.html','utf8');
let source=html.split('<script>')[1].split('</script>')[0];
source=require('./school-adaptations.cjs')(source);
const parsed=ts.createSourceFile('source.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const remove=new Set(['freshDB','loadDB','saveDB','doLogin','quickLogin','logout','registrarLog','bootApp','buildNav','go','gravarNotas','gravarExames','gravarRecursos','executarRenovacoes','importarBD','resetBD','situacaoAluno','canEdit','propinasEmDia','alunoAvaliado','exportarAlunosCSV','exportarElegiveisCSV','imprimirDividas']);
const edits=[];
for(const st of parsed.statements){
 if(ts.isFunctionDeclaration(st)&&remove.has(st.name.text))edits.push([st.getStart(parsed),st.end,'']);
 if(ts.isExpressionStatement(st)&&st.getText(parsed).startsWith('document.addEventListener'))edits.push([st.getStart(parsed),st.end,'']);
 if(ts.isVariableStatement(st)){
  for(const dec of st.declarationList.declarations){
   const key=dec.name.getText(parsed);
   if(['DB_KEY','DB','session','PERMISSOES','PERMISSOES_EDIT','MENU','TITLES'].includes(key)){
    if(['PERMISSOES','PERMISSOES_EDIT','MENU','TITLES'].includes(key)){
     const value=vm.runInNewContext('('+dec.initializer.getText(parsed)+')');
     if(key==='MENU')fs.writeFileSync('frontend/src/app/core/navigation.ts','import { MenuItem } from "./models";\nexport const MENU: MenuItem[]='+JSON.stringify(value,null,2)+';\n');
     else fs.appendFileSync('frontend/src/app/core/navigation.ts','export const '+key+': Record<string, '+(key==='TITLES'?'string[]':'string | string[]')+'> = '+JSON.stringify(value,null,2)+';\n');
    }
    if(['DB_KEY','DB','session','PERMISSOES_EDIT','MENU','TITLES'].includes(key))edits.push([st.getStart(parsed),st.end,'']);
   }
  }
 }
}
// Write navigation independently in canonical order.
let navigation='import { MenuItem } from "./models";\n';
for(const key of ['MENU','TITLES','PERMISSOES']){
 const st=parsed.statements.find(st=>ts.isVariableStatement(st)&&st.declarationList.declarations.some(d=>d.name.getText(parsed)===key));
 const value=vm.runInNewContext('('+st.declarationList.declarations[0].initializer.getText(parsed)+')');
 navigation+='export const '+key+': '+(key==='MENU'?'MenuItem[]':key==='TITLES'?'Record<string, string[]>':'Record<string, string | string[]>')+' = '+JSON.stringify(value,null,2)+';\n';
}
fs.writeFileSync('frontend/src/app/core/navigation.ts',navigation);
for(const [start,end,replacement] of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,start)+replacement+source.slice(end);
source=source.replaceAll('(s,c=document)','(s,c=host)');
source=source.replace(/on(click|change|input)="([^"]*)"/g,(_,event,code)=>{
 code=code.replace(/'\$\{([^}]+)\}'/g,(_,expr)=>'('+expr.replace(/^esc\((.*)\)$/,'$1')+')');
 code=code.replace(/\$\{([^}]+)\}/g,(_,expr)=>'('+expr.replace(/^esc\((.*)\)$/,'$1')+')');
 code=code.replaceAll('(x.f)()','reports[x.f]()').replace(/\bthis\b/g,'element');
 return 'data-sige-'+event+'="${bind((event,element)=>{'+code+'})}"';
});
source=source.replace('onOk();','return onOk();');
source=source.replace('if(el) el.onclick=b.fn;','if(el) el.onclick=e=>runAction(()=>b.fn(e));');
source=source.replaceAll("${title||''}","${esc(title||'')}");
source=source.replace(/can\('(alunos|inscricoes|renovacoes|turmas|classes|cursos|materias|funcionarios|funcoes|atribuicoes|pagamentos|escolas|usuarios|anos-lectivos)'\)/g,"canEdit('$1')");
source=source.replace('function toast(msg,type=\'ok\'){',"function toast(msg,type='ok'){\n if(actionRunning){effects.push(()=>toast(msg,type));return;}");
source=source.replace("function closeModal(){ $('#modalRoot').innerHTML=''; }","function closeModal(){ if(actionRunning){effects.push(closeModal);return;} $('#modalRoot').innerHTML=''; }");
source=source.replace('function renderView(){',`function renderView(){
  if(actionRunning&&dirty){needsRender=true;return;}
  const focused=document.activeElement; const focusId=focused?.id; const selection=focused?.selectionStart;`);
source=source.replace('  if(fn) fn(el); else', '  if(fn){fn(el);groupStudentTables(el);} else');
source=source.replace('el.scrollTop=0;', `if(focusId){const restored=host.querySelector('#'+CSS.escape(focusId));if(restored){restored.focus();try{restored.setSelectionRange(selection,selection);}catch{}}} else el.scrollTop=0; queueMicrotask(pruneActions);`);
// Wrap the actual view invocation to preserve focus while filtering.
source=source.replace(/(VIEWS\[state.view\]\(el\);)/g,'$1\n  groupStudentTables(el);\n  if(focusId){const restored=host.querySelector("#"+CSS.escape(focusId));if(restored){restored.focus();try{restored.setSelectionRange(selection,selection);}catch{}}} queueMicrotask(pruneActions);');
source=source.replace("function imprimir(html,titulo){","function imprimir(html,titulo){\n if(actionRunning){effects.push(()=>imprimir(html,titulo));return;}");
source=source.replace('Os dados são armazenados localmente (localStorage). Faça cópias de segurança regularmente.','Os dados são guardados na base de dados da escola. Faça cópias de segurança regularmente.');
source=source.replace('<input id="u_Senha" value="${esc(d.Senha||\'\')}">','<input id="u_Senha" type="password" autocomplete="new-password" placeholder="${u?\'Deixar vazio para manter\':\'Mínimo 6 caracteres\'}" value="">');
source=source.replace('!obj.Usuario||!obj.Senha||!obj.Nome','!obj.Usuario||(!u&&!obj.Senha)||!obj.Nome');
source=source.replace('function onInsTurma(){', 'function onInsTurma(){').replace("$('#i_Classe').value=t.Classe;","$('#i_Classe').value=t.Classe; $('#i_CodCurso').value=t.Curso; $('#i_Ano').value=t.Ano;");
source=source.replace("if(!obj.CodAluno||obj.Valor<=0)","if(!obj.CodAluno||!obj.CodInscricao||obj.Valor<=0)");
source=source.replace("Curso:(getCurso(g('CodCurso'))||{}).Nome||''","Curso:g('CodCurso')");
source=source.replace("const turmasAno=DB.turmas.filter(t=>t.Ano===(d.Ano||DB.config.anoActivo));","const turmasAno=DB.turmas;");
source=source.replace(/(c|d)\.(MaxNegativas|NegRecurso|NotaRecurso)\|\|(\d+)/g,'$1.$2??$3');
source=source.replace(/num\(\$\('#c_(MaxNeg|NegRec|NotaRec)'\)\.value\)\|\|\d+/g,"num($('#c_$1').value)");
source=source.replaceAll('DB.config.pesoMediaAnual||0.7','DB.config.pesoMediaAnual??0.7').replaceAll('DB.config.pesoExameFinal||0.3','DB.config.pesoExameFinal??0.3');
source=source.replace(/DB.config.(pesoMediaAnual|pesoExameFinal)=num\(g\('\1'\)\)\|\|[\d.]+;/g,"DB.config.$1=num(g('$1'));");
source=source.replaceAll('max="20"','max="${DB.config.escalaMax}"');
source=source.replace("const bloqueada=(session.Perfil==='Professor' && atr && atr.Locked);","const bloqueada=(session.Perfil==='Professor' && ((atr && atr.Locked) || alunos.some(x=>getNotaReg(x.ins.IdInscricao,st.materia,t.Ano)?.Locks?.[perKey])));");
source=source.replace('getNotaReg(x.ins.IdInscricao,st.materia)||{}','getNotaReg(x.ins.IdInscricao,st.materia,t.Ano)||{}');
source=source.replace('return nf!==null && nf<num(DB.config.notaMinima);','return recursoElegivel(x.ins,reg);');
source=source.replace('const ef=reg.ExameFinal;',"const ef=reg[examField(st.tipo)];");
// Only renderExames has st.tipo; print functions must continue to use ExameFinal.
source=source.replace(/function imprimir[\s\S]*/,(tail)=>tail.replaceAll('reg[examField(st.tipo)]','reg.ExameFinal'));
source=source.replace('const ef=reg.ExameFinal;', 'const ef=reg[examField(st.tipo)];');
source=source.replace('const csv=rows.map(r=>r.map(c=>\'"\'+String(c||\'\').replace(/"/g,\'""\')+\'"\')',`const csv=rows.map(r=>r.map(c=>'"'+String(c||'').replace(/^[=+@-]/,c=>"'"+c).replace(/"/g,'""')+'"')`);
source=source.replaceAll('(ano||DB.config.anoActivo)', '(ano||getInsc(codInsc)?.Ano||DB.config.anoActivo)');
source=source.replace('const elegiveis=inscOrig.filter(i=>!jaRenovados.includes(i.CodAluno));', "const elegiveis=inscOrig.filter(i=>!jaRenovados.includes(i.CodAluno)&&['Aprovado','Reprovado'].includes(situacaoAluno(i.IdInscricao)?.situacao)&&DB.propinas?.[i.IdInscricao]?.emDia);");
source=source.replace('const bloqueada=(session.Perfil', "const bloqueada=DB.anosLectivos.find(y=>y.Ano===t.Ano)?.Estado!=='Aberto'||(session.Perfil");
source=source.replace("const dt    = v => { if(!v) return '—'; const p=String(v).slice(0,10).split('-'); return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:v; };", "const dt = v => {if(!v)return '—';const text=String(v).slice(0,10);if(!/^\\d{4}-\\d{2}-\\d{2}$/.test(text))return esc(v);const p=text.split('-');return p[2]+'/'+p[1]+'/'+p[0];};");
source=source.replaceAll('DB.config.notaMinima||10','DB.config.notaMinima??10').replaceAll('>=10','>=num(DB.config.notaMinima)');
source=source.replace("const pags=DB.pagamentos.filter(p=>p.CodAluno===i.CodAluno && p.Referente==='Propina Mensal').length;\n    const devidos=mesAtual+1;", `const year=DB.anosLectivos.find(y=>y.Ano===i.Ano);
    const start=new Date((year?.DataAbertura||i.Data)+'T00:00:00');
    const finish=new Date(Math.min(Date.now(),new Date((year?.DataFecho||today())+'T23:59:59').getTime()));
    const devidos=Math.max(0,Math.min(cl.Duracao||12,(finish.getFullYear()-start.getFullYear())*12+finish.getMonth()-start.getMonth()+1));
    const paid=DB.pagamentos.filter(p=>String(p.CodInscricao)===String(i.IdInscricao)&&p.Referente.startsWith('Propina')).reduce((s,p)=>s+num(p.Valor),0);
    const pags=cl.Propina?Math.min(devidos,paid/cl.Propina):devidos;`);
source=source.replaceAll("].map(x=>`<div class=\"card\"", "].filter(x=>x.f!=='relFuncionarios'||can('funcionarios')).map(x=>`<div class=\"card\"");
const prefix=fs.readFileSync('scripts/renderer-prefix.js','utf8');
const suffix=fs.readFileSync('scripts/renderer-suffix.js','utf8');
fs.writeFileSync('frontend/src/app/promax/promax-renderer.js','// Generated by scripts/build-promax.cjs from the original reference.\nexport function createPromaxRenderer(host,bridge){\n'+prefix+'\n'+source+'\n'+suffix+'\n}\n');
