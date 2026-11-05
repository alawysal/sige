package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.node.*;
import java.time.LocalDate;
import java.util.List;

/** A first real installation contains no fictional people, fees or school contacts. */
public final class ProductionBootstrap {
 private ProductionBootstrap(){}
 static ObjectNode prepare(ObjectNode source,String year,String name){
  if(year==null||year.isBlank()){
   LocalDate now=LocalDate.now();int start=now.getMonthValue()<9?now.getYear()-1:now.getYear();year=start+"/"+(start+1);
  }
  if(!year.matches("\\d{4}/\\d{4}")||Integer.parseInt(year.substring(5))!=Integer.parseInt(year.substring(0,4))+1)
   throw new IllegalArgumentException("INITIAL_SCHOOL_YEAR deve ter o formato 2026/2027, com anos consecutivos.");
  ObjectNode db=source.deepCopy(),school=((ObjectNode)source.path("escolas").get(0)).deepCopy();
  String schoolName=name==null||name.isBlank()?"Escola por configurar":name.trim();
  for(String field:Schools.IDENTITY)school.put(field,field.equals("Nome")?schoolName:"");
  school.put("CodEscola","ESC001");school.putNull("Logo");
  for(Modules.Module module:Modules.ALL)db.putArray(module.name());
  db.withArray("escolas").add(school);
  String start=year.substring(0,4),end=year.substring(5);
  db.withArray("anosLectivos").addObject().put("Ano",year).put("Estado","Aberto").put("DataAbertura",start+"-09-01").put("DataFecho",end+"-08-31");
  ObjectNode config=db.withObject("config");config.put("anoActivo",year);config.putNull("logo");
  for(String field:Schools.IDENTITY)config.put("escola"+field,school.path(field).asText());
  ArrayNode users=db.putArray("usuarios");
  for(var user:source.path("usuarios"))if(user.path("Usuario").asText().equals("admin")){
   ObjectNode admin=user.deepCopy();admin.remove(List.of("Senha","CodFuncionario"));admin.put("CodFuncionario","");admin.put("CodEscola","");users.add(admin);break;
  }
  if(users.size()!=1)throw new IllegalStateException("Conta de administração inicial em falta.");
  db.putArray("logs");return db;
 }
}
