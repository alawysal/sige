package com.escola.gestaoescolar.sige;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
import static com.escola.gestaoescolar.sige.ApiException.require;

@Service
public class Operations {
 final Workspace workspace;final Store store;final Academic academic;
 public Operations(Workspace workspace,Store store,Academic academic){this.workspace=workspace;this.store=store;this.academic=academic;}
 public record Renewal(long revision,String origin,String destination){}
 @Transactional(readOnly=true) public String exportRenewals(Store.Account user,String year){
  if(!Set.of("Administrador","Director","Secretaria").contains(user.role()))throw new ApiException(403,"Sem permissão para exportar alunos.");
  ObjectNode db=store.load();require(Store.find(db,"anosLectivos",year)!=null,"Ano lectivo inexistente.");
  List<JsonNode> eligible=new ArrayList<>();for(JsonNode ins:db.path("inscricoes"))if(ins.path("Ano").asText().equals(year)&&academic.exportEligibility(db,ins).path("elegivel").asBoolean())eligible.add(ins);
  eligible.sort(Comparator.comparing((JsonNode i)->i.path("CodCurso").asText()).thenComparing(i->i.path("Classe").asText()).thenComparing(i->i.path("CodTurma").asText()).thenComparing(i->Store.find(db,"alunos",i.path("CodAluno").asText()).path("Nome").asText()));
  StringBuilder csv=new StringBuilder("\ufeffCurso;Classe;Turma;Ano;Nº Processo;Nome;Sexo;Idade;Situação;Estado\r\n");
  for(JsonNode ins:eligible){JsonNode student=Store.find(db,"alunos",ins.path("CodAluno").asText()),course=Store.find(db,"cursos",ins.path("CodCurso").asText());
   List<String> values=List.of(course.path("Nome").asText(),ins.path("Classe").asText(),ins.path("CodTurma").asText(),year,student.path("IdAluno").asText(),student.path("Nome").asText(),student.path("Sexo").asText(),String.valueOf(Period.between(LocalDate.parse(student.path("DataNa").asText()),LocalDate.now()).getYears()),academic.exportEligibility(db,ins).path("resultado").path("situacao").asText(),"Pendente");
   csv.append(values.stream().map(Operations::csvCell).reduce((a,b)->a+";"+b).orElse("")).append("\r\n");
  }
  return csv.toString();
 }
 static String csvCell(String value){if(value.matches("^[\\s]*[=+@-].*"))value="'"+value;return "\""+value.replace("\"","\"\"")+"\"";}
 @Transactional public ObjectNode renew(Store.Account user,Renewal req){
  workspace.authorize(user,"renovacoes");long revision=store.lock();if(revision!=req.revision())throw new ApiException(409,"Os dados foram alterados. Actualize a página.");
  require(req.origin()!=null&&req.destination()!=null&&!req.origin().equals(req.destination())&&req.destination().compareTo(req.origin())>0,"O ano de destino deve ser posterior ao ano de origem.");
  ObjectNode before=store.load(),after=before.deepCopy();ObjectNode targetYear=Store.find(after,"anosLectivos",req.destination());
  require(targetYear!=null&&!targetYear.path("Estado").asText().equals("Encerrado"),"Ano de destino inexistente ou encerrado.");
  List<JsonNode> source=new ArrayList<>();before.path("inscricoes").forEach(source::add);int renewed=0;
  for(JsonNode ins:source){
   if(!ins.path("Ano").asText().equals(req.origin())||!ins.path("Estado").asText().equals("Matriculado"))continue;
   boolean exists=false;for(JsonNode i:after.path("inscricoes"))if(i.path("CodAluno").equals(ins.path("CodAluno"))&&i.path("Ano").asText().equals(req.destination()))exists=true;if(exists)continue;
   String status=academic.result(before,ins.path("IdInscricao").asText()).path("situacao").asText();if(!Set.of("Aprovado","Reprovado").contains(status)||!SchoolYear.billing(before,ins).path("emDia").asBoolean())continue;
   String className=ins.path("Classe").asText();List<JsonNode> classes=new ArrayList<>();for(JsonNode c:before.path("classes"))if(c.path("PorAno").has(req.destination()))classes.add(c);classes.sort(Comparator.comparingInt(c->Integer.parseInt(c.path("Classe").asText().replaceAll("[^0-9]","").isEmpty()?"0":c.path("Classe").asText().replaceAll("[^0-9]",""))));
   if(status.equals("Aprovado")){int position=-1;for(int i=0;i<classes.size();i++)if(classes.get(i).path("Classe").asText().equals(className))position=i;if(position<0||position+1==classes.size())continue;className=classes.get(position+1).path("Classe").asText();}
   ObjectNode cls=SchoolYear.classFor(after,className,req.destination());if(cls==null)continue;ObjectNode oldTurma=Store.find(after,"turmas",ins.path("CodTurma").asText());
   ObjectNode course=Store.find(after,"cursos",ins.path("CodCurso").asText());if(!Workspace.contains(course.path("AnosActivos"),req.destination()))continue;
   ObjectNode target=null;for(JsonNode t:after.path("turmas"))if(t.path("Ano").asText().equals(req.destination())&&t.path("Classe").asText().equals(className)&&t.path("Curso").equals(ins.path("CodCurso"))&&t.path("Turno").equals(ins.path("Turno"))){int size=0;for(JsonNode i:after.path("inscricoes"))if(i.path("CodTurma").equals(t.path("CodTurma")))size++;if(size<t.path("Capacidade").asInt()){target=(ObjectNode)t;break;}}
   if(target==null){
    target=oldTurma.deepCopy();String code;int seq=after.path("turmas").size()+1;do{code=String.format("T%03d",seq++);}while(Store.find(after,"turmas",code)!=null);
    target.put("CodTurma",code);target.put("Ano",req.destination());target.put("Classe",className);((ArrayNode)after.path("turmas")).add(target);
    for(JsonNode a:before.path("atribuicoes"))if(a.path("CodTurma").equals(ins.path("CodTurma"))){ObjectNode copy=a.deepCopy();copy.put("IdAtribuicao",Store.next(after,"atribuicoes","IdAtribuicao"));copy.put("CodTurma",code);copy.put("Ano",req.destination());copy.put("Locked",false);((ArrayNode)after.path("atribuicoes")).add(copy);}
   }
   ObjectNode newIns=ins.deepCopy();int id=Store.next(after,"inscricoes","IdInscricao");String type=status.equals("Aprovado")?"Renovação":"Repetição";
   newIns.put("IdInscricao",id);newIns.put("Estado","Pendente");newIns.remove(List.of("ConfirmadoPor","DataConfirmacao"));newIns.put("Ano",req.destination());newIns.put("Classe",className);newIns.set("IdClasse",cls.path("IdClasse"));newIns.set("Turma",target.path("CodTurma"));newIns.set("CodTurma",target.path("CodTurma"));newIns.put("Tipo",type);newIns.set("Valor",cls.path("Inscricao"));newIns.put("Data",LocalDate.now().toString());newIns.put("NumMatricula","M"+req.destination().replace("/","")+String.format("%04d",id));newIns.put("Observacao","Renovação automática de "+req.origin());((ArrayNode)after.path("inscricoes")).add(newIns);
   ObjectNode log=after.objectNode();log.put("IdRenovacao",Store.next(after,"renovacoes","IdRenovacao"));log.set("IdInscricaoAntiga",ins.path("IdInscricao"));log.put("IdInscricaoNova",id);log.put("AnoOrigem",req.origin());log.put("AnoDestino",req.destination());log.put("Data",Instant.now().toString());log.put("Tipo",type);((ArrayNode)after.path("renovacoes")).add(log);renewed++;
  }
  workspace.validate(after);workspace.persist(before,after,user,revision+1);store.audit(user.username(),"renovacoes",renewed+" matrículas: "+req.origin()+" → "+req.destination());ObjectNode result=workspace.visible(store.load(),user);result.put("renovadas",renewed);return result;
 }
 @Transactional public ObjectNode restore(Store.Account user,long expected,ObjectNode backup,boolean reset)throws Exception{
  if(!user.role().equals("Administrador"))throw new ApiException(403,"Operação reservada à administração.");long revision=store.lock();if(expected!=revision)throw new ApiException(409,"Os dados foram alterados. Actualize a página.");
  ObjectNode before=store.load();ObjectNode after=reset?(ObjectNode)store.mapper().readTree(new ClassPathResource("demo-data.json").getInputStream()):backup.deepCopy();
  require(after.path("__v").asInt()==3&&after.path("config").isObject(),"Formato de backup inválido.");for(Modules.Module m:Modules.ALL)require(after.path(m.name()).isArray(),"Backup sem o módulo "+m.name()+".");
  // Accounts and password hashes are deliberately never exported or restored.
  after.set("usuarios",before.path("usuarios").deepCopy());SchoolYear.initialize(after);workspace.validate(after);
  // Replace dependent records in reverse order, within this same transaction.
  List<Modules.Module> reverse=new ArrayList<>(Modules.ALL);Collections.reverse(reverse);for(Modules.Module m:reverse)store.jdbc().update("DELETE FROM "+m.table());
  for(Modules.Module m:Modules.ALL)for(JsonNode row:after.path(m.name()))store.upsert(m,row);
  store.config(after.path("config"),revision+1);store.audit(user.username(),reset?"reinicializar_demo":"importar_backup","Dados restaurados; contas e auditoria preservadas");return workspace.visible(store.load(),user);
 }
}
