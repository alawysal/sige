package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.math.BigDecimal;
import java.util.*;

/** Annual tariffs are snapshots: changing a later year never changes an earlier debt. */
public final class SchoolYear {
 public static final List<String> FIELDS=List.of("Inscricao","Propina","Duracao","Valor","MaxNegativas","NegRecurso","NotaRecurso");
 private SchoolYear(){}
 public static ObjectNode settings(JsonNode cls){ObjectNode settings=((ObjectNode)cls).deepCopy();settings.retain(FIELDS);total(settings);return settings;}
 public static void total(ObjectNode cls){cls.put("Valor",cls.path("Propina").decimalValue().multiply(cls.path("Duracao").decimalValue()).add(cls.path("Inscricao").decimalValue()));}
 public static void initialize(ObjectNode db){
  for(JsonNode node:db.path("classes")){
   ObjectNode cls=(ObjectNode)node;total(cls);
   if(!cls.path("PorAno").isObject()){ObjectNode years=cls.putObject("PorAno");for(JsonNode year:db.path("anosLectivos"))years.set(year.path("Ano").asText(),settings(cls));}
   cls.path("PorAno").forEach(y->total((ObjectNode)y));
  }
 }
 public static ObjectNode classFor(ObjectNode db,String name,String year){
  ObjectNode cls=Store.find(db,"classes","Classe",name);
  if(cls==null||!cls.path("PorAno").path(year).isObject())return null;
  ObjectNode value=cls.deepCopy();value.setAll((ObjectNode)cls.path("PorAno").path(year));return value;
 }
 public static ObjectNode billing(ObjectNode db,JsonNode ins){
  ObjectNode result=db.objectNode();String year=ins.path("Ano").asText();
  ObjectNode cls=classFor(db,ins.path("Classe").asText(),year),calendar=Store.find(db,"anosLectivos",year);
  if(cls==null||calendar==null)return result.put("emDia",false);
  LocalDate start=LocalDate.parse(calendar.path("DataAbertura").asText()),end=LocalDate.parse(calendar.path("DataFecho").asText()),today=LocalDate.now();
  LocalDate limit=today.isBefore(end)?today:end;
  int months=limit.isBefore(start)?0:(int)Math.min(cls.path("Duracao").asInt(),ChronoUnit.MONTHS.between(YearMonth.from(start),YearMonth.from(limit))+1);
  BigDecimal paid=BigDecimal.ZERO;
  for(JsonNode payment:db.path("pagamentos"))if(payment.path("CodInscricao").asText().equals(ins.path("IdInscricao").asText())&&payment.path("Referente").asText().startsWith("Propina")&&!LocalDate.parse(payment.path("Data").asText()).isAfter(today))paid=paid.add(payment.path("Valor").decimalValue());
  BigDecimal monthly=cls.path("Propina").decimalValue(),due=monthly.multiply(BigDecimal.valueOf(months)),debt=due.subtract(paid).max(BigDecimal.ZERO);
  result.put("mesesDevidos",months);result.put("devido",due);result.put("pago",paid);result.put("divida",debt);result.put("emDia",debt.signum()==0);
  result.put("mesesEmFalta",monthly.signum()==0?0:debt.divide(monthly,0,java.math.RoundingMode.CEILING).intValue());return result;
 }
}
