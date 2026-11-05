package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import static com.escola.gestaoescolar.sige.ApiException.require;

/** Ownership is checked against persisted records, never a client supplied filter. */
public final class Schools {
 public static final Set<String> GLOBAL=Set.of("Administrador","Ministerio");
 public static final Set<String> TYPES=Set.of("Liceu","Escola Secundária","Escola Técnica","Escola Profissional","Colégio","Instituto Médio","Escola Básica");
 public static final Set<String> CATEGORIES=Set.of("Pública","Privada","Particular","Semipública");
 public static final List<String> IDENTITY=List.of("Nome","NIF","Endereco","Municipio","Provincia","Telefone","Email","Diretor");
 private Schools(){}
 public static boolean owned(String module){return !Set.of("escolas","anosLectivos").contains(module);}
 public static boolean revenue(Store.Account user){return Set.of("Administrador","Director","Financeiro").contains(user.role());}
 public static String first(ObjectNode db){return db.path("escolas").isEmpty()?"":db.path("escolas").get(0).path("CodEscola").asText();}
 public static String context(ObjectNode db,Store.Account user,String requested){
  String school=user.data().path("CodEscola").asText("");
  if(GLOBAL.contains(user.role()))school=requested==null?(user.role().equals("Ministerio")?"":first(db)):requested.equals("*")?"":requested;
  else if(requested!=null&&!requested.equals(school))throw new ApiException(403,"Não pode consultar outra escola.");
  if(!GLOBAL.contains(user.role())&&school.isBlank())throw new ApiException(403,"A conta não tem escola atribuída.");
  if(!school.isBlank()&&Store.find(db,"escolas",school)==null)throw new ApiException(403,"Escola indisponível.");
  return school;
 }
 public static ObjectNode scoped(ObjectNode source,String school){
  ObjectNode db=source.deepCopy();if(school.isBlank())return db;
  for(Modules.Module module:Modules.ALL)if(owned(module.name()))Workspace.filter(db,module.name(),r->school.equals(r.path("CodEscola").asText()));
  return db;
 }
 public static void authorizeRecord(Store.Account user,JsonNode row){
  if(row!=null&&!GLOBAL.contains(user.role())&&!row.path("CodEscola").asText().equals(user.data().path("CodEscola").asText()))throw new ApiException(403,"Registo fora da sua escola.");
 }
 public static void assign(ObjectNode db,Store.Account user,String module,ObjectNode row,JsonNode old,String selected){
  if(!owned(module)||module.equals("usuarios"))return;
  String school=row.path("CodEscola").asText("");
  if(school.isBlank())school=old!=null?old.path("CodEscola").asText():selected;
  require(!school.isBlank(),"Seleccione a escola antes de criar registos.");
  row.put("CodEscola",school);authorizeRecord(user,row);
  if(old!=null)require(school.equals(old.path("CodEscola").asText()),"Não pode mudar a escola de um processo existente.");
 }
 public static ObjectNode institution(ObjectNode db,String school){
  ObjectNode config=db.withObject("config").deepCopy(),record=Store.find(db,"escolas",school);
  if(record!=null){for(String field:IDENTITY)config.put("escola"+field,record.path(field).asText(""));config.set("logo",record.path("Logo").isMissingNode()?config.nullNode():record.path("Logo"));}
  else{config.put("escolaNome","Ministério da Educação Nacional");for(String field:IDENTITY)if(!field.equals("Nome"))config.put("escola"+field,"");config.putNull("logo");}
  return config;
 }
 public static void mergeConfig(ObjectNode db,ObjectNode submitted,String school){
  ObjectNode config=submitted.deepCopy(),record=Store.find(db,"escolas",school);
  require(record!=null,"Seleccione a escola para guardar as configurações.");
  for(String field:IDENTITY)record.set(field,config.path("escola"+field));record.set("Logo",config.path("logo"));
  // The legacy config identity remains a compatibility mirror of the original school.
  ObjectNode original=institution(db,first(db));for(String field:IDENTITY)config.set("escola"+field,original.path("escola"+field));config.set("logo",original.path("logo"));db.set("config",config);
 }
 public static void migrate(ObjectNode db){
  String fallback=first(db);require(!fallback.isBlank(),"Registe pelo menos uma escola.");
  for(JsonNode s:db.path("escolas")){
   ObjectNode school=(ObjectNode)s;
   if(!school.hasNonNull("Tipo"))school.put("Tipo",school.path("Nome").asText().toLowerCase(Locale.ROOT).contains("liceu")?"Liceu":"Escola Secundária");
   if(!school.hasNonNull("Categoria"))school.put("Categoria","Pública");
   if(!school.has("Logo"))school.set("Logo",school.path("CodEscola").asText().equals(fallback)&&db.path("config").has("logo")?db.path("config").path("logo"):school.nullNode());
  }
  for(Modules.Module m:Modules.ALL)if(owned(m.name()))for(JsonNode item:db.path(m.name())){
   ObjectNode row=(ObjectNode)item;if(!row.path("CodEscola").asText("").isBlank())continue;
   String school="";
   for(String parent:List.of("CodInscricao","CodTurma","CodAluno","IdInscricaoAntiga"))if(row.hasNonNull(parent)){
    String module=parent.equals("CodTurma")?"turmas":parent.equals("CodAluno")?"alunos":"inscricoes";
    JsonNode related=Store.find(db,module,row.path(parent).asText());if(related!=null&&!related.path("CodEscola").asText("").isBlank()){school=related.path("CodEscola").asText();break;}
   }
   row.put("CodEscola",school.isBlank()?fallback:school);
  }
  for(JsonNode u:db.path("usuarios"))if(!GLOBAL.contains(u.path("Perfil").asText())&&u.path("CodEscola").asText("").isBlank()){
   JsonNode employee=Store.find(db,"funcionarios",u.path("CodFuncionario").asText());((ObjectNode)u).put("CodEscola",employee==null?fallback:employee.path("CodEscola").asText());
  }
 }
 public static void validate(ObjectNode db){
  for(JsonNode school:db.path("escolas")){Workspace.required(school,"Nome","Tipo","Categoria");require(TYPES.contains(school.path("Tipo").asText()),"Tipo de escola inválido.");require(CATEGORIES.contains(school.path("Categoria").asText()),"Categoria de escola inválida.");StudentProfile.image(school.path("Logo"),"Logotipo da escola");}
  for(Modules.Module m:Modules.ALL)if(owned(m.name()))for(JsonNode row:db.path(m.name())){
   String school=row.path("CodEscola").asText("");require(!school.isBlank()&&Store.find(db,"escolas",school)!=null,"Escola obrigatória em "+m.name()+".");
   for(Modules.Ref ref:m.refs())if(owned(ref.target())&&!row.path(ref.field()).asText("").isBlank()){
    JsonNode related=Store.find(db,ref.target(),row.path(ref.field()).asText());require(related!=null&&school.equals(related.path("CodEscola").asText()),"Não é permitido ligar registos de escolas diferentes.");
   }
  }
  for(JsonNode user:db.path("usuarios")){
   String school=user.path("CodEscola").asText("");
   if(!GLOBAL.contains(user.path("Perfil").asText()))require(!school.isBlank()&&Store.find(db,"escolas",school)!=null,"Atribua uma escola ao utilizador.");
   if(!user.path("CodFuncionario").asText("").isBlank()){JsonNode employee=Store.find(db,"funcionarios",user.path("CodFuncionario").asText());require(employee!=null&&(GLOBAL.contains(user.path("Perfil").asText())||school.equals(employee.path("CodEscola").asText())),"O funcionário deve pertencer à escola do utilizador.");}
  }
 }
 public static ObjectNode counters(ObjectNode db){ObjectNode counters=db.objectNode();for(Modules.Module m:Modules.ALL){int max=0;for(JsonNode row:db.path(m.name())){String digits=row.path(m.key()).asText().replaceAll("^.*?([0-9]+)$","$1");try{max=Math.max(max,Integer.parseInt(digits));}catch(NumberFormatException ignored){}}counters.put(m.key(),max);}return counters;}
}
