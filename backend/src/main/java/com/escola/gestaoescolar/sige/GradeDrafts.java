package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Instant;
import java.util.*;
import static com.escola.gestaoescolar.sige.ApiException.require;

public final class GradeDrafts {
 private GradeDrafts(){}
 public static void teacher(Store.Account user,ObjectNode old,ObjectNode row,int scale){
  String draft=row.path("DraftTerm").asText(""),submit=row.path("SubmitTerm").asText("");
  require(draft.isBlank()!=submit.isBlank(),"Escolha Guardar rascunho ou Validar período.");String term=draft.isBlank()?submit:draft;
  require(Academic.TERMS.contains(term),"Período inválido.");
  ObjectNode locks=old!=null&&old.path("Locks").isObject()?old.withObject("Locks").deepCopy():row.objectNode();
  if(locks.path(term).asBoolean())throw new ApiException(403,"Este período já foi validado e está bloqueado.");
  ObjectNode drafts=old!=null&&old.path("Rascunhos").isObject()?old.withObject("Rascunhos").deepCopy():row.objectNode();
  JsonNode incoming=row.path(term);require(incoming.isObject(),"Indique as notas do período.");
  ObjectNode values=row.objectNode();for(String kind:Academic.TYPES){JsonNode value=incoming.path(kind);if(value.isMissingNode()||value.isNull())values.putNull(kind);else{Workspace.integer(incoming,kind,0,scale);values.set(kind,value);}}
  for(String other:Academic.TERMS){
   ObjectNode official=row.objectNode();for(String kind:Academic.TYPES)official.putNull(kind);
   if(old!=null&&old.path(other).isObject())official=old.withObject(other).deepCopy();
   if(!other.equals(term)&&row.path(other).isObject())require(row.path(other).equals(official),"Guarde apenas um período de cada vez.");
   row.set(other,official);
  }
  if(!draft.isBlank())drafts.set(term,values);
  else{
   require(drafts.path(term).isObject()&&drafts.path(term).equals(values),"Guarde primeiro o rascunho destas notas antes de validar.");
   for(String kind:Academic.TYPES)require(Academic.number(values.get(kind)),"Preencha MAC, NPP e NPT de todos os alunos antes de validar.");
   row.set(term,values);drafts.remove(term);locks.put(term,true);
  }
  ObjectNode info=old!=null&&old.path("EstadoPeriodos").isObject()?old.withObject("EstadoPeriodos").deepCopy():row.objectNode();
  info.putObject(term).put("Estado",submit.isBlank()?"Rascunho":"Validado").put("Usuario",user.username()).put("Data",Instant.now().toString());
  row.set("EstadoPeriodos",info);row.set("Rascunhos",drafts);row.set("Locks",locks);row.remove(List.of("DraftTerm","SubmitTerm"));
 }
 public static void completeSubmission(ObjectNode db,Store.Account user,List<Workspace.Change> changes){
  if(!user.role().equals("Professor"))return;
  for(Workspace.Change change:changes)if(change.module().equals("notas")&&change.record()!=null&&!change.record().path("SubmitTerm").asText("").isBlank()){
   String term=change.record().path("SubmitTerm").asText();JsonNode submitted=Store.find(db,"notas",change.id());JsonNode enrollment=Store.find(db,"inscricoes",submitted.path("CodInscricao").asText());
   for(JsonNode ins:db.path("inscricoes"))if(ins.path("CodTurma").equals(enrollment.path("CodTurma"))&&ins.path("Ano").equals(enrollment.path("Ano"))&&ins.path("Estado").asText().equals("Matriculado")){
    boolean locked=false;for(JsonNode grade:db.path("notas"))if(grade.path("CodInscricao").equals(ins.path("IdInscricao"))&&grade.path("CodMateria").asText().equals(submitted.path("CodMateria").asText()))locked=grade.path("Locks").path(term).asBoolean();
    require(locked,"A validação do período deve incluir todos os alunos matriculados da turma nesta disciplina.");
   }
  }
 }
}
