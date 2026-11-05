package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.escola.gestaoescolar.sige.ApiException.require;

@Service
public class Workspace {
 @org.springframework.beans.factory.annotation.Value("${sige.demo-seed:true}") private boolean demoSeed;
 final Store store;final Academic academic;final PasswordEncoder encoder;
 static final Set<String> ROLES=Set.of("Administrador","Director","Secretaria","Financeiro","Professor","Pedagogico","Ministerio");
 static final Set<String> SECRETARY=Set.of("alunos","inscricoes","renovacoes","turmas","classes","cursos","materias","funcionarios","funcoes","documentosEmitidos");
 public Workspace(Store store,Academic academic,PasswordEncoder encoder){this.store=store;this.academic=academic;this.encoder=encoder;}
 public record Change(String module,String kind,String id,ObjectNode record){}
 public record Transaction(long revision,List<Change> changes,ObjectNode config){}
 public boolean canWrite(Store.Account user,String module){return switch(user.role()){
  case "Administrador"->true;
  case "Director"->!Set.of("usuarios","config","escolas","anosLectivos").contains(module);
  case "Secretaria"->SECRETARY.contains(module);
  case "Financeiro"->module.equals("pagamentos");
  case "Professor"->module.equals("notas");
  case "Pedagogico"->Set.of("notas","exames","recursos","atribuicoes").contains(module);
  default->false;
 };}
 void authorize(Store.Account user,String module){if(!canWrite(user,module))throw new ApiException(403,"Sem permissão para alterar "+module+".");}
 @Transactional(readOnly=true) public ObjectNode snapshot(Store.Account user){return visible(store.load(),user);}
 @Transactional(readOnly=true) public ObjectNode snapshot(Store.Account user,String school){return visible(store.load(),user,school);}
 @Transactional(readOnly=true) public ObjectNode backup(Store.Account user){if(!user.role().equals("Administrador"))throw new ApiException(403,"Operação reservada ao administrador.");ObjectNode db=store.load();db.putArray("usuarios");db.putArray("logs");return db;}
 ObjectNode visible(ObjectNode db,Store.Account user){
  return visible(db,user,null);
 }
 ObjectNode visible(ObjectNode all,Store.Account user,String requested){
  String selected=Schools.context(all,user,requested);ObjectNode db=Schools.scoped(all,selected);db.put("demoMode",demoSeed);
  db.set("counters",Schools.counters(all));ObjectNode scope=db.putObject("scope");scope.put("schoolId",selected);scope.put("global",Schools.GLOBAL.contains(user.role()));scope.put("receitas",Schools.revenue(user));
  if(!Schools.GLOBAL.contains(user.role()))filter(db,"escolas",s->s.path("CodEscola").asText().equals(selected));
  ArrayNode schoolOptions=scope.putArray("schools");for(JsonNode s:db.path("escolas")){ObjectNode option=s.deepCopy();option.retain("CodEscola","Nome","Tipo","Categoria");schoolOptions.add(option);}
  if(user.role().equals("Administrador")){ArrayNode staff=scope.putArray("staff");for(JsonNode f:all.path("funcionarios")){ObjectNode option=f.deepCopy();option.retain("IdFuncionario","CodEscola","Nome");staff.add(option);}}
  ObjectNode results=db.putObject("resultados");for(JsonNode ins:db.path("inscricoes"))results.set(ins.path("IdInscricao").asText(),academic.result(db,ins.path("IdInscricao").asText()));
  ObjectNode bills=db.putObject("propinas"),exports=db.putObject("elegibilidadeExportacao"),documents=db.putObject("elegibilidadeDocumentos");
  for(JsonNode ins:db.path("inscricoes")){String id=ins.path("IdInscricao").asText();bills.set(id,SchoolYear.billing(db,ins));exports.set(id,academic.exportEligibility(db,ins));documents.set(id,academic.documentEligibility(db,ins));}
  if(!user.role().equals("Administrador")){db.putArray("usuarios");db.putArray("logs");}
  if(!Schools.revenue(user)){
   db.putArray("pagamentos");for(JsonNode bill:bills)((ObjectNode)bill).remove("pago");for(JsonNode export:exports)if(export.path("propinas").isObject())((ObjectNode)export.path("propinas")).remove("pago");
  }
  if(user.role().equals("Ministerio")){
   for(JsonNode a:db.path("alunos"))((ObjectNode)a).retain("IdAluno","CodEscola","Nome","Sexo","DataNa","Natural","Regiao","Pai","Mae","Estado");
   for(JsonNode f:db.path("funcionarios"))((ObjectNode)f).retain("IdFuncionario","CodEscola","Nome","Categoria");
  }
  if(!Set.of("Administrador","Pedagogico","Professor").contains(user.role()))for(JsonNode n:db.path("notas"))((ObjectNode)n).remove("Rascunhos");
  if(user.role().equals("Financeiro")){
   for(JsonNode f:db.path("funcionarios"))((ObjectNode)f).retain("IdFuncionario","Nome","Categoria");
   db.putArray("funcoes");
  }
  if(user.role().equals("Professor")){
   Set<String> classrooms=new HashSet<>(),students=new HashSet<>(),enrollments=new HashSet<>();String employee=user.data().path("CodFuncionario").asText();
   filter(db,"atribuicoes",a->a.path("CodFuncionario").asText().equals(employee));for(JsonNode a:db.path("atribuicoes"))classrooms.add(a.path("CodTurma").asText());
   filter(db,"turmas",t->classrooms.contains(t.path("CodTurma").asText()));
   filter(db,"inscricoes",i->classrooms.contains(i.path("CodTurma").asText()));
   for(JsonNode i:db.path("inscricoes")){students.add(i.path("CodAluno").asText());enrollments.add(i.path("IdInscricao").asText());}
   filter(db,"alunos",a->students.contains(a.path("IdAluno").asText()));filter(db,"notas",n->{ObjectNode ins=Store.find(db,"inscricoes",n.path("CodInscricao").asText());if(ins==null)return false;for(JsonNode a:db.path("atribuicoes"))if(a.path("CodTurma").equals(ins.path("CodTurma"))&&a.path("Ano").equals(n.path("Ano"))&&a.path("IdMateria").asText().equals(n.path("CodMateria").asText()))return true;return false;});
   results.removeAll();bills.removeAll();exports.removeAll();documents.removeAll();
   Set<String> subjects=new HashSet<>();for(JsonNode a:db.path("atribuicoes"))subjects.add(a.path("IdMateria").asText());filter(db,"materias",m->subjects.contains(m.path("IdMateria").asText()));
   for(JsonNode a:db.path("alunos"))((ObjectNode)a).retain("IdAluno","Nome","Sexo","DataNa","Estado");
   for(String key:List.of("pagamentos","funcionarios","funcoes","renovacoes","documentosEmitidos","exames","recursos"))db.putArray(key);
  }
  db.set("config",Schools.institution(all,selected));db.set("session",user.data().deepCopy());return db;
 }
 static void filter(ObjectNode db,String key,java.util.function.Predicate<JsonNode> predicate){ArrayNode list=db.arrayNode();for(JsonNode row:db.path(key))if(predicate.test(row))list.add(row);db.set(key,list);}
 @Transactional public ObjectNode apply(Store.Account user,Transaction tx){return apply(user,tx,null);}
 @Transactional public ObjectNode apply(Store.Account user,Transaction tx,String requested){
  require(tx.changes()!=null&&tx.changes().size()<=5000,"Operação demasiado grande ou inválida.");
  long revision=store.lock();if(revision!=tx.revision())throw new ApiException(409,"Os dados foram alterados por outro utilizador. Actualize a página e repita a operação.");
  ObjectNode before=store.load(),after=before.deepCopy();String selected=Schools.context(before,user,requested);
  for(Change c:tx.changes()){
   require(c.module()!=null&&c.id()!=null&&c.id().length()<=80,"Identificador inválido.");authorize(user,c.module());
   if(c.module().equals("renovacoes"))throw new ApiException(422,"Use a operação de renovação de matrículas.");
   String key=c.module().equals("usuarios")?"IdUsuario":Modules.get(c.module()).key();
   ObjectNode previous=Store.find(before,c.module(),key,c.id());if(Schools.owned(c.module()))Schools.authorizeRecord(user,previous);
   if("delete".equals(c.kind())){
    if(c.module().equals("notas")&&user.role().equals("Professor"))throw new ApiException(403,"O professor não pode eliminar notas.");
    filter(after,c.module(),r->!r.path(key).asText().equals(c.id()));
    if(c.module().equals("anosLectivos")){for(JsonNode cls:after.path("classes"))((ObjectNode)cls.path("PorAno")).remove(c.id());for(JsonNode course:after.path("cursos")){ArrayNode years=after.arrayNode();for(JsonNode year:course.path("AnosActivos"))if(!year.asText().equals(c.id()))years.add(year);((ObjectNode)course).set("AnosActivos",years);}}
   }else if("upsert".equals(c.kind())){
    require(c.record()!=null&&c.record().path(key).asText().equals(c.id()),"Identificador do registo inconsistente.");
    ObjectNode row=c.record().deepCopy();Schools.assign(after,user,c.module(),row,previous,selected);if(c.module().equals("alunos"))StudentProfile.normalize(row);if(c.module().equals("notas"))protectGrade(user,before,after,row);
    if(c.module().equals("classes")){
     SchoolYear.total(row);if(!row.path("PorAno").isObject()){ObjectNode years=row.putObject("PorAno");years.set(after.path("config").path("anoActivo").asText(),SchoolYear.settings(row));}
     for(JsonNode settings:row.path("PorAno")){require(settings.isObject(),"Tarifas anuais inválidas.");SchoolYear.total((ObjectNode)settings);}
    }
    if(c.module().equals("anosLectivos")&&Store.find(before,"anosLectivos",c.id())==null){
     for(JsonNode cls:after.path("classes")){JsonNode origin=cls.path("PorAno").path(before.path("config").path("anoActivo").asText());if(origin.isObject())((ObjectNode)cls).withObject("PorAno").set(c.id(),origin.deepCopy());}
    }
    if(c.module().equals("inscricoes")){
     ObjectNode old=Store.find(before,"inscricoes",c.id());
     if(old!=null&&!old.path("Estado").asText().equals("Matriculado")&&row.path("Estado").asText().equals("Matriculado")){
      boolean renewed=false;for(JsonNode r:before.path("renovacoes"))if(r.path("IdInscricaoNova").asText().equals(c.id()))renewed=true;
      if(renewed)require(academic.exportEligibility(before,old).path("elegivel").asBoolean(),"A renovação exige avaliação concluída e propinas do ano de origem em dia.");
      row.put("ConfirmadoPor",user.username());row.put("DataConfirmacao",Instant.now().toString());
     }
    }
    filter(after,c.module(),r->!r.path(key).asText().equals(c.id()));((ArrayNode)after.path(c.module())).add(row);
   }else throw new ApiException(400,"Operação inválida.");
  }
  if(tx.config()!=null){
   authorize(user,"config");
   Schools.mergeConfig(after,tx.config(),selected);
  }
  // Administrative unlock explicitly reopens submitted terms for this assignment.
  for(Change c:tx.changes())if(c.module().equals("atribuicoes")&&c.record()!=null&&!c.record().path("Locked").asBoolean()){
   ObjectNode old=Store.find(before,"atribuicoes",c.id());
   if(old!=null&&old.path("Locked").asBoolean())for(JsonNode n:after.path("notas")){
    ObjectNode ins=Store.find(after,"inscricoes",n.path("CodInscricao").asText());
    if(ins!=null&&ins.path("CodTurma").equals(c.record().path("CodTurma"))&&n.path("CodMateria").asText().equals(c.record().path("IdMateria").asText()))((ObjectNode)n).putObject("Locks");
   }
  }
  cascadeStudentDeletes(before,after);
  if(!canWrite(user,"pagamentos")&&!before.path("pagamentos").equals(after.path("pagamentos")))throw new ApiException(403,"Não pode eliminar um processo ou matrícula com pagamentos associados.");
  validate(after);
  GradeDrafts.completeSubmission(after,user,tx.changes());
  for(Change c:tx.changes())if(c.module().equals("pagamentos")&&c.kind().equals("upsert"))PaymentRules.validateSubmission(after,Store.find(after,"pagamentos",c.id()));
  for(Change c:tx.changes())if(c.module().equals("documentosEmitidos")&&c.kind().equals("upsert")){
   ObjectNode row=Store.find(after,"documentosEmitidos",c.id());String type=row.path("Tipo").asText();
   require(Set.of("declaracao","certificado","certificado-freq","certificado-conc","diploma","boletim","ficha","atestado").contains(type),"Tipo de documento inválido.");
   ObjectNode enrollment=null;for(JsonNode i:after.path("inscricoes"))if(i.path("CodAluno").equals(row.path("CodAluno"))&&i.path("Ano").equals(after.path("config").path("anoActivo")))enrollment=(ObjectNode)i;
   require(enrollment!=null,"Aluno sem matrícula no ano activo.");
   require(academic.documentEligibility(after,enrollment).path("elegivel").asBoolean(),"Documentos oficiais exigem aprovação, avaliações completas e ausência de dívida de propinas.");
   if(type.equals("diploma"))require(enrollment.path("Classe").asText().equals("12ª Classe"),"Diploma reservado à conclusão da 12ª classe.");
   row.set("CodInscricao",enrollment.path("IdInscricao"));row.set("Ano",enrollment.path("Ano"));row.put("Usuario",user.data().path("Nome").asText());row.put("Data",Instant.now().toString());
  }
  persist(before,after,user,revision+1);
  store.audit(user.username(),"gravar",tx.changes().stream().map(c->c.module()+":"+c.kind()+":"+c.id()).reduce((a,b)->a+"; "+b).orElse("configurações"));
  return visible(store.load(),user,requested);
 }
 void protectGrade(Store.Account user,ObjectNode before,ObjectNode after,ObjectNode row){
  ObjectNode old=Store.find(before,"notas",row.path("IdNota").asText());
  if(old!=null)for(String field:List.of("CodInscricao","CodMateria","Ano"))require(old.path(field).asText().equals(row.path(field).asText()),"A identidade da avaliação não pode ser alterada.");
  ObjectNode ins=Store.find(after,"inscricoes",row.path("CodInscricao").asText());require(ins!=null&&ins.path("Estado").asText().equals("Matriculado"),"O aluno deve ter a matrícula confirmada para receber avaliações.");
  boolean assigned=false;for(JsonNode a:after.path("atribuicoes"))if(a.path("CodTurma").equals(ins.path("CodTurma"))&&a.path("Ano").equals(row.path("Ano"))&&a.path("IdMateria").asText().equals(row.path("CodMateria").asText()))assigned=true;
  if(!user.role().equals("Professor"))require(assigned,"Matéria não atribuída à turma neste ano lectivo.");
  ObjectNode year=Store.find(after,"anosLectivos",ins.path("Ano").asText());
  require(year!=null&&year.path("Estado").asText().equals("Aberto"),"O ano lectivo está encerrado ou ainda não foi aberto.");
  if(user.role().equals("Professor")){
   JsonNode assignment=null;
   for(JsonNode a:after.path("atribuicoes"))if(a.path("CodFuncionario").asText().equals(user.data().path("CodFuncionario").asText())&&a.path("CodTurma").equals(ins.path("CodTurma"))&&a.path("IdMateria").asText().equals(row.path("CodMateria").asText())&&a.path("Ano").asText().equals(row.path("Ano").asText()))assignment=a;
   if(assignment==null||assignment.path("Locked").asBoolean())throw new ApiException(403,"Turma/matéria não atribuída ou lançamento bloqueado.");
   for(String field:List.of("ExameFinal","ExameRecurso","ExameEspecial","ExameAcesso"))if(!Objects.equals(old==null?null:old.get(field),row.get(field))&&!(old==null&&row.path(field).isNull()))throw new ApiException(403,"O professor só pode lançar avaliações trimestrais.");
   GradeDrafts.teacher(user,old,row,after.path("config").path("escalaMax").asInt());
  }
  row.remove(List.of("SubmitTerm","DraftTerm"));
  row.put("CodProfessor",user.data().path("CodFuncionario").asText());row.put("DataLancamento",Instant.now().toString());
  if(!row.path("ExameRecurso").isNull()&&!row.path("ExameRecurso").isMissingNode()&&(old==null||!old.path("ExameRecurso").equals(row.path("ExameRecurso"))))require(academic.eligible(after,row),"Aluno não elegível para recurso segundo as regras da classe.");
 }
 void cascadeStudentDeletes(ObjectNode before,ObjectNode after){
  Set<String> removed=new HashSet<>();for(JsonNode a:before.path("alunos"))if(Store.find(after,"alunos",a.path("IdAluno").asText())==null)removed.add(a.path("IdAluno").asText());
  if(!removed.isEmpty()){filter(after,"inscricoes",i->!removed.contains(i.path("CodAluno").asText()));filter(after,"pagamentos",i->!removed.contains(i.path("CodAluno").asText()));filter(after,"documentosEmitidos",i->!removed.contains(i.path("CodAluno").asText()));}
  Set<String> removedIns=new HashSet<>();for(JsonNode i:before.path("inscricoes"))if(Store.find(after,"inscricoes",i.path("IdInscricao").asText())==null)removedIns.add(i.path("IdInscricao").asText());
  for(String key:List.of("notas","pagamentos","exames","recursos"))filter(after,key,n->!removedIns.contains(n.path("CodInscricao").asText()));
  filter(after,"renovacoes",r->!removedIns.contains(r.path("IdInscricaoAntiga").asText())&&!removedIns.contains(r.path("IdInscricaoNova").asText()));
 }
 void validate(ObjectNode db){
  Schools.validate(db);
  JsonNode cfg=db.path("config");required(cfg,"escolaNome","anoActivo");
  require(Store.find(db,"anosLectivos",cfg.path("anoActivo").asText())!=null,"Ano lectivo activo inexistente.");
  StudentProfile.image(cfg.path("logo"),"Logotipo");
  double scale=cfg.path("escalaMax").asDouble();range(cfg,"escalaMax",1,100);range(cfg,"notaMinima",0,scale);range(cfg,"notaRecursoMin",0,cfg.path("notaMinima").asDouble());
  range(cfg,"pesoMediaAnual",0,1);range(cfg,"pesoExameFinal",0,1);require(Math.abs(cfg.path("pesoMediaAnual").asDouble()+cfg.path("pesoExameFinal").asDouble()-1)<.00001,"Os pesos da média e do exame devem somar 1.");
  for(Modules.Module m:Modules.ALL){
   Set<String> ids=new HashSet<>();
   for(JsonNode row:db.path(m.name())){
    String id=row.path(m.key()).asText();require(id.matches("[A-Za-z0-9_/-]{1,80}")&&ids.add(id),"Identificador inválido ou duplicado em "+m.name()+".");
    require(row.toString().length()<=(Set.of("alunos","escolas").contains(m.name())?420000:64000),"Registo demasiado grande.");
    for(Modules.Ref ref:m.refs())if(!row.path(ref.field()).asText("").isBlank())require(Store.find(db,ref.target(),row.path(ref.field()).asText())!=null,"Referência inválida: "+m.name()+" → "+ref.target()+". Existem registos associados ou dados em falta.");
   }
  }
  for(JsonNode a:db.path("anosLectivos")){required(a,"Ano","Estado","DataAbertura","DataFecho");require(a.path("Ano").asText().matches("\\d{4}/\\d{4}"),"Ano lectivo inválido.");require(Set.of("Aberto","Encerrado","Planeado").contains(a.path("Estado").asText()),"Estado do ano inválido.");date(a,"DataAbertura");date(a,"DataFecho");require(a.path("DataAbertura").asText().compareTo(a.path("DataFecho").asText())<=0,"O fecho deve ser posterior à abertura.");}
  for(JsonNode a:db.path("alunos")){StudentProfile.validate(a);required(a,"Nome","DataNa","Encarregado","Movel1","Natural","Morada","DocN");date(a,"DataNa");require(LocalDate.parse(a.path("DataNa").asText()).isBefore(LocalDate.now()),"Nascimento deve ser anterior a hoje.");require(Set.of("M","F").contains(a.path("Sexo").asText()),"Sexo inválido.");}
  Set<String> classNames=new HashSet<>();
  for(JsonNode c:db.path("classes")){
   required(c,"Classe");require(classNames.add(c.path("CodEscola").asText()+":"+c.path("Classe").asText()),"Designação de classe repetida na escola.");require(c.path("PorAno").isObject(),"Indique as tarifas da classe por ano lectivo.");
   Iterator<Map.Entry<String,JsonNode>> entries=c.path("PorAno").fields();while(entries.hasNext()){
    var entry=entries.next();require(Store.find(db,"anosLectivos",entry.getKey())!=null,"Ano das tarifas inexistente.");JsonNode tariff=entry.getValue();
    range(tariff,"Inscricao",0,1e9);range(tariff,"Propina",0,1e9);integer(tariff,"Duracao",1,24);integer(tariff,"MaxNegativas",0,100);integer(tariff,"NegRecurso",tariff.path("MaxNegativas").asInt(),100);integer(tariff,"NotaRecurso",0,cfg.path("notaMinima").asInt());
    require(Math.abs(tariff.path("Valor").asDouble()-tariff.path("Propina").asDouble()*tariff.path("Duracao").asInt()-tariff.path("Inscricao").asDouble())<.001,"Total da classe deve ser mensalidade × meses + inscrição.");
   }
  }
  for(JsonNode m:db.path("materias"))required(m,"Materia","Sigla");
  for(JsonNode c:db.path("cursos")){required(c,"Nome");require(c.path("AnosActivos").isArray(),"Indique os anos activos do curso.");for(JsonNode y:c.path("AnosActivos"))require(Store.find(db,"anosLectivos",y.asText())!=null,"Ano do curso não existe.");}
  for(JsonNode f:db.path("funcionarios"))required(f,"Nome");
  for(JsonNode t:db.path("turmas")){required(t,"Turma","Ano","Classe","Curso","Turno");range(t,"Capacidade",1,500);require(SchoolYear.classFor(db,t.path("Classe").asText(),t.path("Ano").asText(),t.path("CodEscola").asText())!=null,"Classe da turma inexistente.");JsonNode course=Store.find(db,"cursos",t.path("Curso").asText());require(course!=null&&contains(course.path("AnosActivos"),t.path("Ano").asText()),"Curso não está activo no ano da turma.");}
  Set<String> enrollments=new HashSet<>();Map<String,Integer> counts=new HashMap<>();
  for(JsonNode i:db.path("inscricoes")){
   required(i,"CodAluno","Ano","CodTurma","CodCurso","Classe","Data","Estado");require(Set.of("Pendente","Matriculado","Transferido","Desistente","Concluído","Cancelada").contains(i.path("Estado").asText()),"Estado de matrícula inválido.");date(i,"Data");range(i,"Valor",0,1e9);
   require(enrollments.add(i.path("CodAluno").asText()+":"+i.path("Ano").asText()),"O aluno já tem matrícula neste ano lectivo.");
   ObjectNode t=Store.find(db,"turmas",i.path("CodTurma").asText());require(t!=null,"Turma inexistente.");
   require(t.path("Ano").equals(i.path("Ano"))&&t.path("Classe").equals(i.path("Classe"))&&t.path("Curso").equals(i.path("CodCurso"))&&t.path("Turno").equals(i.path("Turno")),"A turma deve corresponder ao ano, classe, curso e turno da matrícula.");
   if(Set.of("Matriculado","Pendente").contains(i.path("Estado").asText()))counts.merge(t.path("CodTurma").asText(),1,Integer::sum);
  }
  for(JsonNode t:db.path("turmas"))require(counts.getOrDefault(t.path("CodTurma").asText(),0)<=t.path("Capacidade").asInt(),"Capacidade da turma excedida: "+t.path("CodTurma").asText());
  Set<String> assignments=new HashSet<>();for(JsonNode a:db.path("atribuicoes")){required(a,"CodFuncionario","CodTurma","IdMateria","Ano");JsonNode t=Store.find(db,"turmas",a.path("CodTurma").asText());require(t!=null&&t.path("Ano").equals(a.path("Ano")),"O ano da atribuição deve coincidir com o da turma.");require(assignments.add(a.path("CodTurma").asText()+":"+a.path("IdMateria").asText()+":"+a.path("Ano").asText()),"Já existe professor atribuído à matéria nesta turma/ano.");}
  Set<String> grades=new HashSet<>();for(JsonNode n:db.path("notas")){
   required(n,"CodInscricao","CodMateria","Ano");require(grades.add(n.path("CodInscricao").asText()+":"+n.path("CodMateria").asText()+":"+n.path("Ano").asText()),"Avaliação duplicada.");
   require(Store.find(db,"inscricoes",n.path("CodInscricao").asText()).path("Ano").equals(n.path("Ano")),"Ano da avaliação inconsistente.");
   for(String term:Academic.TERMS)for(String kind:Academic.TYPES)if(!n.path(term).path(kind).isNull()&&!n.path(term).path(kind).isMissingNode())integer(n.path(term),kind,0,scale);
   for(String exam:List.of("ExameFinal","ExameRecurso","ExameEspecial","ExameAcesso"))if(!n.path(exam).isNull()&&!n.path(exam).isMissingNode())integer(n,exam,0,scale);
  }
  Set<String> receipts=new HashSet<>(),tuition=new HashSet<>();for(JsonNode p:db.path("pagamentos")){
   required(p,"CodAluno","CodInscricao","Referente","Talao","Data","FormaPagamento");date(p,"Data");range(p,"Valor",.01,1e9);
   require(receipts.add(p.path("Talao").asText()),"Número de talão duplicado.");require(Store.find(db,"inscricoes",p.path("CodInscricao").asText()).path("CodAluno").equals(p.path("CodAluno")),"Pagamento e matrícula devem pertencer ao mesmo aluno.");
   if(p.path("Referente").asText().equals("Propina Mensal")){required(p,"Mes");require(tuition.add(p.path("CodInscricao").asText()+":"+p.path("Mes").asText()),"Esta propina mensal já foi paga.");}
  }
  Set<String> users=new HashSet<>();boolean admin=false;
  for(JsonNode u:db.path("usuarios")){
   required(u,"IdUsuario","Usuario","Nome","Perfil","Ativo");require(u.path("Usuario").asText().matches("[A-Za-z0-9._-]{3,80}")&&users.add(u.path("Usuario").asText().toLowerCase(Locale.ROOT)),"Nome de utilizador inválido ou repetido.");
   require(ROLES.contains(u.path("Perfil").asText()),"Perfil inválido.");require(Set.of("Sim","Não").contains(u.path("Ativo").asText()),"Estado inválido.");
   if(!u.path("CodFuncionario").asText("").isBlank())require(Store.find(db,"funcionarios",u.path("CodFuncionario").asText())!=null,"Funcionário do utilizador inexistente.");
   if(u.path("Perfil").asText().equals("Professor"))required(u,"CodFuncionario");
   if(!u.path("Senha").asText("").isBlank())require(u.path("Senha").asText().length()>=6&&u.path("Senha").asText().length()<=72,"A palavra-passe deve ter entre 6 e 72 caracteres.");
   if(u.path("Perfil").asText().equals("Administrador")&&u.path("Ativo").asText().equals("Sim"))admin=true;
  }
  require(admin,"Deve existir pelo menos um administrador activo.");
 }
 static void required(JsonNode row,String...fields){for(String field:fields)require(!row.path(field).asText("").isBlank(),"Preencha o campo obrigatório: "+field+".");}
 static void range(JsonNode row,String field,double min,double max){JsonNode value=row.path(field);require(value.isNumber()&&Double.isFinite(value.asDouble())&&value.asDouble()>=min&&value.asDouble()<=max,"Valor inválido em "+field+" ("+min+" a "+max+").");}
 static void integer(JsonNode row,String field,double min,double max){range(row,field,min,max);require(row.path(field).asDouble()==Math.rint(row.path(field).asDouble()),"A nota ou quantidade em "+field+" deve ser um número inteiro.");}
 static void date(JsonNode row,String field){try{LocalDate.parse(row.path(field).asText());}catch(Exception e){throw new ApiException(422,"Data inválida: "+field+".");}}
 static boolean contains(JsonNode list,String value){for(JsonNode n:list)if(n.asText().equals(value))return true;return false;}
 void persist(ObjectNode before,ObjectNode after,Store.Account actor,long revision){
  JsonNode self=Store.find(after,"usuarios","Usuario",actor.username());require(self!=null,"Não pode eliminar a sua própria conta.");
  for(Modules.Module m:Modules.ALL)for(JsonNode row:after.path(m.name())){JsonNode old=Store.find(before,m.name(),row.path(m.key()).asText());if(!row.equals(old))store.upsert(m,row);}
  for(JsonNode row:after.path("usuarios")){
   JsonNode old=Store.find(before,"usuarios","IdUsuario",row.path("IdUsuario").asText());
   if(!row.equals(old)){
    Store.Account existing=store.account(old==null?row.path("Usuario").asText():old.path("Usuario").asText());String password=row.path("Senha").asText("");
    require(existing!=null||!password.isBlank(),"Defina a palavra-passe do novo utilizador.");
    String hash=password.isBlank()?existing.password():encoder.encode(password);store.user((ObjectNode)row,hash,existing!=null);
   }
  }
  for(JsonNode u:before.path("usuarios"))if(Store.find(after,"usuarios","IdUsuario",u.path("IdUsuario").asText())==null)store.jdbc().update("DELETE FROM sige_users WHERE id=?",u.path("IdUsuario").asText());
  List<Modules.Module> reversed=new ArrayList<>(Modules.ALL);Collections.reverse(reversed);
  for(Modules.Module m:reversed)for(JsonNode row:before.path(m.name()))if(Store.find(after,m.name(),row.path(m.key()).asText())==null)store.delete(m,row.path(m.key()).asText());
  store.config(after.path("config"),revision);
 }
}
