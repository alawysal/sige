const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('0001_promax.html','utf8');
const source = html.slice(html.indexOf('function freshDB()'),html.indexOf('function loadDB()'));
let seed = 37;
const math = Object.create(Math);
math.random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const db = vm.runInNewContext(`const PERIODOS=['I Trimestre','II Trimestre','III Trimestre']; const TIPOS_AVAL=['MAC','NPP','NPT']; ${source}; freshDB()`, {Math: math});
// The prototype creates three records for each subject. Persist one record with all terms.
const grades = new Map();
for(const n of db.notas){
  const key = `${n.CodInscricao}:${n.CodMateria}:${n.Ano}`;
  const previous = grades.get(key);
  if(previous){ for(const term of ['I_Trimestre','II_Trimestre','III_Trimestre']) if(n[term].MAC!==null) previous[term]=n[term]; }
  else grades.set(key,{...n,IdNota:grades.size+1});
}
db.notas=[...grades.values()];
db.pagamentos.forEach((p,i)=>p.IdPagamento=i+1);
Object.assign(db.config,JSON.parse(fs.readFileSync('backend/src/main/resources/gb-defaults.json','utf8')));
for(const field of ['Nome','NIF','Endereco','Municipio','Provincia','Telefone','Email','Diretor'])db.escolas[0][field]=db.config['escola'+field];
for(const c of db.classes)c.Valor=c.Propina*c.Duracao+c.Inscricao;
fs.writeFileSync('backend/src/main/resources/demo-data.json',JSON.stringify(db,null,2)+'\n');
