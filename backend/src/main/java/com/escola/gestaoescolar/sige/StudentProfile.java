package com.escola.gestaoescolar.sige;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.*;
import java.util.*;
import java.io.ByteArrayInputStream;
import javax.imageio.ImageIO;
import static com.escola.gestaoescolar.sige.ApiException.require;

/** Preserves legacy single choices while storing the new multi-choice fields. */
public final class StudentProfile {
 private StudentProfile(){}
 static final Set<String> DISABILITIES=Set.of("Nenhuma","Física","Visual","Auditiva","Intelectual","Nanismo","Albinismo","Autismo","Múltipla","Outra");
 static final Set<String> ATTACHMENTS=Set.of("Bilhete de Identidade","Cédula Pessoal","Certidão de Nascimento","Certificado de Habilitações","Declaração de Matrícula","Atestado Médico","Fotografia Tipo Passe","Comprovativo de Residência","Diploma");
 static final Map<String,String> LEGACY=Map.ofEntries(Map.entry("Fisica","Física"),Map.entry("Especial","Intelectual"),Map.entry("Bilhete","Bilhete de Identidade"),Map.entry("Cédula","Cédula Pessoal"),Map.entry("Certificado","Certificado de Habilitações"),Map.entry("Declaração","Declaração de Matrícula"),Map.entry("Atestado","Atestado Médico"),Map.entry("Foto","Fotografia Tipo Passe"));
 public static void normalize(ObjectNode student){choices(student,"Deficiencias","Deficiencia",true);choices(student,"AnexosList","Anexos",false);}
 private static void choices(ObjectNode row,String field,String legacy,boolean disability){
  if(!row.has(field)||row.path(field).isNull()){
   ArrayNode list=row.putArray(field);for(String choice:row.path(legacy).asText("").split(",\\s*")){if(!choice.isBlank()&&!choice.equals("Nada"))list.add(LEGACY.getOrDefault(choice,choice));}
   if(disability&&list.isEmpty())list.add("Nenhuma");
  }
  if(row.path(field).isArray()){
   List<String> labels=new ArrayList<>();for(JsonNode choice:row.path(field))labels.add(choice.asText());row.put(legacy,labels.isEmpty()?(disability?"Nenhuma":"Nada"):String.join(", ",labels));
  }
 }
 public static void validate(JsonNode row){
  validateChoices(row,"Deficiencias",DISABILITIES);validateChoices(row,"AnexosList",ATTACHMENTS);
  JsonNode list=row.path("Deficiencias");require(!list.isArray()||!Workspace.contains(list,"Nenhuma")||list.size()==1,"Nenhuma não pode ser combinada com outras deficiências.");
  image(row.path("Foto"),"Fotografia");
 }
 private static void validateChoices(JsonNode row,String field,Set<String> allowed){JsonNode values=row.path(field);if(values.isMissingNode())return;require(values.isArray()&&values.size()<=allowed.size(),"Opções inválidas em "+field+".");Set<String> unique=new HashSet<>();for(JsonNode value:values)require(value.isTextual()&&allowed.contains(value.asText())&&unique.add(value.asText()),"Opção inválida ou repetida em "+field+".");}
 public static void image(JsonNode node,String label){
  if(node.isNull()||node.isMissingNode())return;
  require(node.isTextual()&&node.asText().length()<=350000,label+": imagem demasiado grande.");
  String data=node.asText();if(data.isEmpty())return;
  require(data.startsWith("data:image/png;base64,")||data.startsWith("data:image/jpeg;base64,"),label+": utilize PNG ou JPEG.");
  try{
   byte[] bytes=Base64.getDecoder().decode(data.substring(data.indexOf(',')+1));
   try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){var readers=ImageIO.getImageReaders(stream);require(readers.hasNext(),label+": conteúdo de imagem inválido.");var reader=readers.next();try{reader.setInput(stream);String format=reader.getFormatName().toLowerCase(Locale.ROOT);require(data.startsWith("data:image/"+(format.equals("jpeg")?"jpeg":"png")+";")&&Set.of("png","jpeg").contains(format),label+": formato inconsistente.");require(reader.getWidth(0)>0&&reader.getHeight(0)>0&&(long)reader.getWidth(0)*reader.getHeight(0)<=4000000,label+": dimensões demasiado grandes.");require(reader.read(0)!=null,label+": imagem inválida.");}finally{reader.dispose();}}
  }catch(ApiException ex){throw ex;}catch(Exception ex){throw new ApiException(422,label+": conteúdo de imagem inválido.");}
 }
}
