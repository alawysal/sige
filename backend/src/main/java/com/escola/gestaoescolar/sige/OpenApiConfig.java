package com.escola.gestaoescolar.sige;

import io.swagger.v3.oas.models.*;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.*;
import io.swagger.v3.oas.models.parameters.RequestBody;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.*;
import io.swagger.v3.oas.models.servers.Server;
import io.swagger.v3.oas.models.examples.Example;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.*;
import java.util.*;

@Configuration
public class OpenApiConfig {
 @Bean OpenAPI schoolApi(){
  return new OpenAPI().info(new Info().title("SIGE Guiné-Bissau — API").version("6.0")
   .description("API utilizada pelo frontend Angular e persistida em MySQL. "
    +"1. Execute POST /api/auth/login. 2. Copie o token da resposta. 3. Em Authorize, cole apenas o token, sem o prefixo Bearer. "
    +"4. Consulte GET /api/workspace e use a revision recebida nas operações de escrita. "
    +"Os pedidos executados aqui alteram a mesma base de dados usada pela aplicação /sige. As permissões do perfil aplicam-se também no Swagger."))
   .servers(List.of(new Server().url("/").description("Mesma origem: API directa ou proxy do frontend")))
   .components(new Components().addSecuritySchemes("bearerAuth",new SecurityScheme().type(SecurityScheme.Type.HTTP).scheme("bearer").bearerFormat("JWT")
    .description("Token devolvido por POST /api/auth/login. Não inclua a palavra Bearer.")))
   .addSecurityItem(new SecurityRequirement().addList("bearerAuth"));
 }
 private static ObjectSchema object(){ObjectSchema schema=new ObjectSchema();schema.setAdditionalProperties(true);return schema;}
 private static Schema<?> ref(String name){return new Schema<>().$ref("#/components/schemas/"+name);}
 private static ApiResponse jsonResponse(String description,Schema<?> schema){return new ApiResponse().description(description).content(new Content().addMediaType("application/json",new MediaType().schema(schema)));}
 private static RequestBody body(Schema<?> schema,Object example){return new RequestBody().required(true).content(new Content().addMediaType("application/json",new MediaType().schema(schema).example(example)));}

 @Bean OpenApiCustomizer contracts(){return api->{
  Components models=api.getComponents();
  models.addSchemas("ApiError",new ObjectSchema().addProperty("message",new StringSchema().example("Os dados foram alterados. Actualize a página.")));
  ObjectSchema workspace=object();workspace.addProperty("revision",new IntegerSchema().format("int64").description("Revisão obrigatória para gravar; obtenha novamente após cada alteração."));
  workspace.addProperty("__v",new IntegerSchema().example(3));workspace.addProperty("config",object());workspace.addProperty("session",object());
  for(Modules.Module module:Modules.ALL)workspace.addProperty(module.name(),new ArraySchema().items(object()).description("Chave do registo: "+module.key()));
  for(String list:List.of("usuarios","logs"))workspace.addProperty(list,new ArraySchema().items(object()));
  for(String field:List.of("resultados","propinas","elegibilidadeExportacao","elegibilidadeDocumentos"))workspace.addProperty(field,object());
  models.addSchemas("WorkspaceData",workspace);
  List<String> modules=new ArrayList<>();for(Modules.Module module:Modules.ALL)if(!module.name().equals("renovacoes"))modules.add(module.name());modules.add("usuarios");
  ObjectSchema change=new ObjectSchema();change.addProperty("module",new StringSchema()._enum(modules));change.addProperty("kind",new StringSchema()._enum(List.of("upsert","delete")));
  change.addProperty("id",new StringSchema().description("Valor da chave do registo, convertido em texto."));change.addProperty("record",object().description("Registo completo para upsert; omitir para delete. O formato depende do módulo e mantém os campos dos formulários."));change.setRequired(List.of("module","kind","id"));models.addSchemas("Change",change);
  ObjectSchema transaction=new ObjectSchema();transaction.addProperty("revision",new IntegerSchema().format("int64"));transaction.addProperty("changes",new ArraySchema().items(ref("Change")).maxItems(5000));transaction.addProperty("config",object().nullable(true).description("Configuração completa, apenas quando for alterada."));transaction.setRequired(List.of("revision","changes"));models.addSchemas("Transaction",transaction);

  api.getPaths().forEach((path,item)->item.readOperations().forEach(operation->{
   boolean publicEndpoint=Set.of("/api/auth/login","/api/health").contains(path);
   if(publicEndpoint)operation.setSecurity(Collections.emptyList());
   else {operation.addSecurityItem(new SecurityRequirement().addList("bearerAuth"));operation.getResponses().addApiResponse("401",jsonResponse("Sessão inválida ou expirada",ref("ApiError"))).addApiResponse("403",jsonResponse("Perfil sem permissão",ref("ApiError")));}
   operation.getResponses().addApiResponse("400",jsonResponse("Pedido inválido",ref("ApiError")));
   switch(path){
    case "/api/auth/login" -> {
     operation.operationId("login").summary("Iniciar sessão e obter JWT").tags(List.of("Autenticação"));
     operation.getRequestBody().getContent().get("application/json").example(Map.of("username","admin","password","admin123"));
     operation.getResponses().addApiResponse("200",jsonResponse("Sessão iniciada",new ObjectSchema().addProperty("token",new StringSchema()).addProperty("user",object())))
      .addApiResponse("401",jsonResponse("Credenciais inválidas ou conta inactiva",ref("ApiError"))).addApiResponse("429",jsonResponse("Demasiadas tentativas de login",ref("ApiError")));
    }
    case "/api/auth/me" -> {operation.operationId("currentUser").summary("Consultar a conta autenticada").tags(List.of("Autenticação"));operation.getResponses().addApiResponse("200",jsonResponse("Conta sem palavra-passe",object()));}
    case "/api/health" -> {operation.operationId("health").summary("Verificar API e ligação MySQL").tags(List.of("Estado"));operation.getResponses().addApiResponse("200",jsonResponse("Ligação verificada",new ObjectSchema().addProperty("status",new StringSchema().example("UP")).addProperty("database",new StringSchema().example("mysql"))));}
    case "/api/workspace" -> {operation.operationId("workspace").summary("Carregar os dados permitidos para o frontend").tags(List.of("Dados escolares")).description("Devolve módulos, tarifas anuais, resultados calculados e revisão. Dados de outros perfis são filtrados pelo servidor; palavras-passe e hashes não são devolvidos.");operation.getResponses().addApiResponse("200",jsonResponse("Dados permitidos para este perfil",ref("WorkspaceData")));}
    case "/api/transactions" -> {
     operation.operationId("transact").summary("Criar, editar ou eliminar registos numa transacção").tags(List.of("Dados escolares"))
      .description("Obtenha revision em GET /api/workspace. Cada upsert contém o registo completo; delete exige module e id. Validação, permissões e gravação são atómicas. Uma revisão desactualizada devolve 409 sem gravar. A eliminação de alunos pode eliminar matrículas e registos associados.");
     Map<String,Object> student=Map.ofEntries(Map.entry("IdAluno","ALU_DEMO_001"),Map.entry("Nome","Aluno Exemplo"),Map.entry("DataNa","2010-05-12"),Map.entry("Sexo","M"),Map.entry("Natural","Bissau"),Map.entry("Morada","Rua Exemplo"),Map.entry("DocN","DOC-DEMO-001"),Map.entry("Encarregado","Encarregado Exemplo"),Map.entry("Movel1","955000000"),Map.entry("Estado","Activo"));
     MediaType media=new MediaType().schema(ref("Transaction"));media.addExamples("Criar ou editar aluno",new Example().description("Substitua revision pela revisão actual. No caso de edição, envie todos os campos do registo obtido no workspace.").value(Map.of("revision",0,"changes",List.of(Map.of("module","alunos","kind","upsert","id","ALU_DEMO_001","record",student)))));
     media.addExamples("Eliminar o aluno de exemplo",new Example().value(Map.of("revision",0,"changes",List.of(Map.of("module","alunos","kind","delete","id","ALU_DEMO_001")))));
     operation.requestBody(new RequestBody().required(true).content(new Content().addMediaType("application/json",media)));
     writeResponses(operation);
    }
    case "/api/renewals" -> {operation.operationId("renew").summary("Criar matrículas pendentes para o ano seguinte").tags(List.of("Matrículas"))
     .description("Administrador, director ou secretaria. Apenas alunos avaliados e com propinas em dia no ano de origem. A matrícula criada fica Pendente, aguardando confirmação.");operation.getRequestBody().getContent().get("application/json").example(Map.of("revision",0,"origin","2026/2027","destination","2027/2028"));writeResponses(operation);}
    case "/api/exports/renewals" -> {operation.operationId("exportRenewals").summary("Exportar alunos elegíveis em CSV").tags(List.of("Matrículas"));operation.description("Administrador, director ou secretaria. Revalida avaliações e propinas do ano de origem e exige matrícula pendente no destino. Não confirma a matrícula.");operation.getResponses().addApiResponse("200",new ApiResponse().description("CSV agrupado por curso, classe e turma, com idades").content(new Content().addMediaType("text/csv",new MediaType().schema(new StringSchema())))).addApiResponse("422",jsonResponse("Ano inválido",ref("ApiError")));}
    case "/api/backup/restore" -> {operation.operationId("restore").summary("Repor um backup escolar").tags(List.of("Administração")).description("Apenas administrador. Substitui os dados escolares pelo backup; preserva contas e auditoria. data deve conter um backup completo exportado na aplicação, com __v igual a 3.");ObjectSchema request=new ObjectSchema();request.addProperty("revision",new IntegerSchema().format("int64"));request.addProperty("data",ref("WorkspaceData"));request.setRequired(List.of("revision","data"));operation.requestBody(body(request,null));writeResponses(operation);}
    case "/api/demo/reset" -> {operation.operationId("resetDemo").summary("Repor os dados escolares de demonstração").tags(List.of("Administração")).description("Apenas administrador. Substitui os dados escolares actuais. Contas e auditoria são preservadas.");ObjectSchema request=new ObjectSchema();request.addProperty("revision",new IntegerSchema().format("int64"));request.setRequired(List.of("revision"));operation.requestBody(body(request,Map.of("revision",0)));writeResponses(operation);}
    default -> {}
   }
  }));
 };}
 private static void writeResponses(Operation operation){operation.getResponses().addApiResponse("200",jsonResponse("Workspace actualizado e nova revisão",ref("WorkspaceData"))).addApiResponse("409",jsonResponse("Revisão desactualizada; recarregue o workspace",ref("ApiError"))).addApiResponse("422",jsonResponse("Dados ou regra escolar inválidos; nenhuma alteração gravada",ref("ApiError")));}
}
