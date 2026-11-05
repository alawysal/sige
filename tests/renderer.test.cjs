const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'frontend/src/app/promax/promax-renderer.js'),'utf8');
const referencePath=path.join(root,'SIGE_RGB.html');
const reference=fs.existsSync(referencePath)?fs.readFileSync(referencePath,'utf8'):null;
new vm.Script(source.replace('export function','function'));
assert(!/localStorage|sessionStorage|new Function|\beval\s*\(|<iframe/.test(source));
assert(!/\son(?:click|input|change)="/.test(source));
const navigation=fs.readFileSync(path.join(root,'frontend/src/app/core/navigation.ts'),'utf8');
const views=JSON.parse(navigation.match(/export const MENU[^=]*=\s*(\[[\s\S]*?\]);/)[1]).map(item=>item.k);
assert.equal(views.length,29);
for(const view of views)assert(source.includes('VIEWS.'+view+' =')||source.includes('VIEWS.'+view+'=')||source.includes("VIEWS['"+view+"'] ="),'Missing feature: '+view);
const css=fs.readFileSync(path.join(root,'frontend/src/styles.css'),'utf8');
if(reference)assert(css.includes(reference.split('<style>')[1].split('</style>')[0]),'The original design stylesheet must be preserved');
console.log('Renderer: all '+views.length+' navigation views, closure events and no browser database verified.');
// Execute the generated grade functions to cover zero weights and decimal input.
const ts=require('../frontend/node_modules/typescript');
const tree=ts.createSourceFile('renderer.js',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
const statements=tree.statements.find(ts.isFunctionDeclaration).body.statements;
const wanted=new Set(['num','int','PERIODOS','mediaTrimestre','mediaAnual','notaFinalDisciplina','gradeValue','previewMedia']);
const gradeCode=statements.filter(s=>ts.isFunctionDeclaration(s)?wanted.has(s.name.text):ts.isVariableStatement(s)&&s.declarationList.declarations.some(d=>wanted.has(d.name.getText(tree)))).map(s=>s.getText(tree)).join('\n');
const grade={ExameFinal:8,I_Trimestre:{MAC:16,NPP:16,NPT:16},II_Trimestre:{MAC:16,NPP:16,NPT:16},III_Trimestre:{MAC:16,NPP:16,NPT:16}};
for(const [annual,exam,expected] of [[0,1,8],[1,0,16]])assert.equal(vm.runInNewContext(gradeCode+'\nnotaFinalDisciplina(grade)',{DB:{config:{pesoMediaAnual:annual,pesoExameFinal:exam,escalaMax:20}},grade}),expected);
assert.throws(()=>vm.runInNewContext(gradeCode+'\npreviewMedia({value:"14.5"})',{DB:{config:{escalaMax:20}}}),/inteira/);
console.log('Generated grade functions: zero weights respected and decimal input rejected without rounding.');
// Ministry search and academic history use the generated production code.
const historyFunction=statements.find(s=>ts.isFunctionDeclaration(s)&&s.name.text==='studentAcademicHistory').getText(tree);
const ministryView=statements.filter(s=>ts.isExpressionStatement(s)&&s.getText(tree).startsWith('VIEWS.alunos=')).at(-1).getText(tree);
const fixture={
 config:{pesoExameFinal:0.3},
 alunos:[{IdAluno:'A1',Nome:'Ana <Silva>',CodEscola:'E1'},{IdAluno:'A2',Nome:'Beto',CodEscola:'E2'}],
 inscricoes:[{IdInscricao:'I2',CodAluno:'A1',Ano:'2026/2027',Classe:'11ª',CodTurma:'T2',CodEscola:'E1'},{IdInscricao:'I1',CodAluno:'A1',Ano:'2025/2026',Classe:'10ª',CodTurma:'T1',CodEscola:'E1'}],
 atribuicoes:[{CodTurma:'T1',Ano:'2025/2026',IdMateria:1},{CodTurma:'T2',Ano:'2026/2027',IdMateria:1}],
 materias:[{IdMateria:1,Materia:'Matemática'}],
 notas:[{CodInscricao:'I1',Ano:'2025/2026',CodMateria:1,I_Trimestre:{MAC:0,NPP:0,NPT:0}}]
};
const escape=value=>String(value??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const context={DB:fixture,VIEWS:{},session:{Perfil:'Ministerio'},state:{filtro_alunos:'liceu'},schoolName:id=>id==='E1'?'Liceu Bissau':'Escola Bafatá',esc:escape,schoolStudents:()=>assert.fail('Ministry must use its consultation view'),situacaoAluno:id=>id==='I1'?{situacao:'Em curso',avaliado:false,mediaGeral:0}:null,mediaTrimestre:(grade,term)=>grade[term]?.MAC??null,notaFinalComRecurso:()=>0,bind:()=>"test-action",el:{}};
vm.createContext(context);vm.runInContext(historyFunction+'\n'+ministryView+'\nVIEWS.alunos(el);',context);
assert(context.el.innerHTML.includes('Ana &lt;Silva&gt;'));assert(!context.el.innerHTML.includes('Beto'));assert(!context.el.innerHTML.includes('Novo Aluno'));assert(!context.el.innerHTML.includes('formAluno'));
for(const query of ['a2','beto','inexistente']){context.state.filtro_alunos=query;vm.runInContext('VIEWS.alunos(el)',context);assert(context.el.innerHTML.includes(query==='inexistente'?'Nenhum aluno encontrado.':'Beto'));}
const before=JSON.stringify(fixture);
const history=vm.runInContext("studentAcademicHistory('A1')",context);
assert(history.indexOf('2025/2026')<history.indexOf('2026/2027'));assert(history.includes('Matemática'));assert(history.includes('Média geral (parcial): 0'));assert(history.includes('<td>0</td>'));assert(history.includes('<td>—</td>'));
assert(vm.runInContext("studentAcademicHistory('A1',true)",context).includes('prt-tabela'));
assert(vm.runInContext("studentAcademicHistory('missing')",context).includes('Sem matrículas registadas.'));assert.equal(JSON.stringify(fixture),before);
console.log('Ministry: read-only cross-school search by name, ID and school; history: years, missing grades, zero values, print and no mutations verified.');
