package com.escola.gestaoescolar.sige;
import com.fasterxml.jackson.databind.*;
import com.fasterxml.jackson.databind.node.*;
import org.springframework.stereotype.Component;
import java.util.*;

@Component
public class Academic {
 public static final List<String> TERMS=List.of("I_Trimestre","II_Trimestre","III_Trimestre");
 public static final List<String> TYPES=List.of("MAC","NPP","NPT");
 static boolean number(JsonNode n){return n!=null&&n.isNumber();}
 static double round(double n,int places){double p=Math.pow(10,places);return Math.round(n*p)/p;}
 public Double term(JsonNode grade,String term){List<Double> values=new ArrayList<>();for(String kind:TYPES)if(number(grade.path(term).get(kind)))values.add(grade.path(term).get(kind).asDouble());return values.isEmpty()?null:round(values.stream().mapToDouble(x->x).average().orElseThrow(),0);}
 public Double annual(JsonNode grade){List<Double> values=TERMS.stream().map(t->term(grade,t)).filter(Objects::nonNull).toList();return values.isEmpty()?null:round(values.stream().mapToDouble(x->x).average().orElseThrow(),0);}
 public Double finalGrade(JsonNode grade,JsonNode cfg,boolean resource){
  Double annual=annual(grade);if(annual==null)return null;
  double value=number(grade.get("ExameFinal"))?annual*cfg.path("pesoMediaAnual").asDouble(.7)+grade.path("ExameFinal").asDouble()*cfg.path("pesoExameFinal").asDouble(.3):annual;
  if(resource&&number(grade.get("ExameRecurso")))value=Math.max(value,grade.path("ExameRecurso").asDouble());return round(value,0);
 }
 public boolean complete(JsonNode grade,JsonNode cfg){for(String term:TERMS)for(String kind:TYPES)if(!number(grade.path(term).get(kind)))return false;return cfg.path("pesoExameFinal").asDouble(.3)==0||number(grade.get("ExameFinal"));}
 public ObjectNode result(ObjectNode db,String enrollment){
  ObjectNode ins=Store.find(db,"inscricoes",enrollment);if(ins==null)return null;
  JsonNode cfg=db.path("config");ObjectNode cls=SchoolYear.classFor(db,ins.path("Classe").asText(),ins.path("Ano").asText(),ins.path("CodEscola").asText());
  Set<String> subjects=new LinkedHashSet<>();for(JsonNode a:db.path("atribuicoes"))if(a.path("CodTurma").asText().equals(ins.path("CodTurma").asText())&&a.path("Ano").asText().equals(ins.path("Ano").asText()))subjects.add(a.path("IdMateria").asText());
  int negatives=0,recoverable=0,count=0;double sum=0;boolean completed=!subjects.isEmpty();
  for(String subject:subjects){ObjectNode grade=grade(db,enrollment,subject,ins.path("Ano").asText());Double value=grade==null?null:finalGrade(grade,cfg,true);if(value!=null){count++;sum+=value;if(value<cfg.path("notaMinima").asDouble(10)){negatives++;if(!number(grade.get("ExameRecurso"))&&value>=(cls==null?8:cls.path("NotaRecurso").asDouble(8)))recoverable++;}}if(grade==null||!complete(grade,cfg))completed=false;}
  int max=cls==null?2:cls.path("MaxNegativas").asInt(2),rec=cls==null?4:cls.path("NegRecurso").asInt(4);
  String status=!completed?"Em curso":negatives<=max?"Aprovado":negatives<=rec&&negatives-recoverable<=max?"Recurso":"Reprovado";
  ObjectNode r=db.objectNode();r.put("negativas",negatives);r.put("maxNeg",max);r.put("negRec",rec);r.put("situacao",status);r.put("avaliado",completed);r.put("total",count);r.put("totalMat",subjects.size());if(count==0)r.putNull("mediaGeral");else r.put("mediaGeral",round(sum/count,0));return r;
 }
 public ObjectNode grade(ObjectNode db,String ins,String subject,String year){for(JsonNode n:db.path("notas"))if(n.path("CodInscricao").asText().equals(ins)&&n.path("CodMateria").asText().equals(subject)&&n.path("Ano").asText().equals(year))return (ObjectNode)n;return null;}
 public boolean eligible(ObjectNode db,JsonNode grade){
  ObjectNode ins=Store.find(db,"inscricoes",grade.path("CodInscricao").asText());if(ins==null)return false;
  ObjectNode cls=SchoolYear.classFor(db,ins.path("Classe").asText(),ins.path("Ano").asText(),ins.path("CodEscola").asText());Double value=finalGrade(grade,db.path("config"),false);
  if(value==null||!complete(grade,db.path("config"))||value>=db.path("config").path("notaMinima").asDouble(10)||value<(cls==null?8:cls.path("NotaRecurso").asDouble(8)))return false;
  int negatives=0;
  for(JsonNode assignment:db.path("atribuicoes"))if(assignment.path("CodTurma").equals(ins.path("CodTurma"))&&assignment.path("Ano").equals(ins.path("Ano"))){ObjectNode n=grade(db,ins.path("IdInscricao").asText(),assignment.path("IdMateria").asText(),ins.path("Ano").asText());Double f=n==null?null:finalGrade(n,db.path("config"),false);if(f!=null&&f<db.path("config").path("notaMinima").asDouble(10))negatives++;}
  return result(db,ins.path("IdInscricao").asText()).path("avaliado").asBoolean()&&negatives<=(cls==null?4:cls.path("NegRecurso").asInt(4));
 }
 public ObjectNode documentEligibility(ObjectNode db,JsonNode enrollment){
  ObjectNode info=db.objectNode();ObjectNode result=result(db,enrollment.path("IdInscricao").asText());
  boolean approved=Set.of("Matriculado","Concluído").contains(enrollment.path("Estado").asText())&&result.path("avaliado").asBoolean()&&result.path("situacao").asText().equals("Aprovado");
  boolean paid=SchoolYear.billing(db,enrollment).path("emDia").asBoolean();info.put("elegivel",approved&&paid);info.put("aprovado",approved);info.put("semDivida",paid);return info;
 }
 public ObjectNode exportEligibility(ObjectNode db,JsonNode enrollment){
  ObjectNode info=db.objectNode();info.put("elegivel",false);
  if(!enrollment.path("Estado").asText().equals("Pendente"))return info;
  ObjectNode origin=null;
  for(JsonNode renewal:db.path("renovacoes"))if(renewal.path("IdInscricaoNova").asText().equals(enrollment.path("IdInscricao").asText()))origin=Store.find(db,"inscricoes",renewal.path("IdInscricaoAntiga").asText());
  if(origin==null)return info;
  ObjectNode result=result(db,origin.path("IdInscricao").asText());ObjectNode bill=SchoolYear.billing(db,origin);
  info.put("anoOrigem",origin.path("Ano").asText());info.put("inscricaoOrigem",origin.path("IdInscricao").asText());info.set("resultado",result);info.set("propinas",bill);
  info.put("elegivel",result.path("avaliado").asBoolean()&&Set.of("Aprovado","Reprovado").contains(result.path("situacao").asText())&&bill.path("emDia").asBoolean());return info;
 }
}
