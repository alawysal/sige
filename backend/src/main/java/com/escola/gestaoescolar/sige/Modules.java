package com.escola.gestaoescolar.sige;
import java.util.*;
/** Fixed SQL identifiers; user input is never interpolated into SQL. */
public final class Modules {
 public record Ref(String column,String field,String target) {}
 public record Module(String name,String key,List<Ref> refs) { public String table(){return "sige_"+name.toLowerCase(Locale.ROOT);} }
 private static Ref ref(String field,String target){return new Ref(field.toLowerCase(Locale.ROOT),field,target);}
 private static Module m(String name,String key,Ref...refs){List<Ref> links=new ArrayList<>(List.of(refs));if(Schools.owned(name)&&links.stream().noneMatch(r->r.field().equals("CodEscola")))links.add(ref("CodEscola","escolas"));return new Module(name,key,List.copyOf(links));}
 public static final List<Module> ALL=List.of(
  m("anosLectivos","Ano"),m("escolas","CodEscola"),m("cursos","CodCurso"),m("classes","IdClasse",ref("CodEscola","escolas")),
  m("materias","IdMateria"),m("funcionarios","IdFuncionario"),m("alunos","IdAluno"),
  m("turmas","CodTurma",ref("Ano","anosLectivos"),ref("Curso","cursos"),ref("CodEscola","escolas"),ref("CodFuncionario","funcionarios")),
  m("funcoes","IdFuncao",ref("CodFuncionario","funcionarios"),ref("CodEscola","escolas")),
  m("atribuicoes","IdAtribuicao",ref("CodFuncionario","funcionarios"),ref("CodTurma","turmas"),ref("IdMateria","materias"),ref("Ano","anosLectivos")),
  m("inscricoes","IdInscricao",ref("CodAluno","alunos"),ref("Ano","anosLectivos"),ref("CodTurma","turmas"),ref("CodCurso","cursos")),
  m("notas","IdNota",ref("CodInscricao","inscricoes"),ref("CodMateria","materias"),ref("Ano","anosLectivos")),
  m("exames","IdExame",ref("CodInscricao","inscricoes")),m("recursos","IdRecurso",ref("CodInscricao","inscricoes")),
  m("pagamentos","IdPagamento",ref("CodAluno","alunos"),ref("CodInscricao","inscricoes")),
  m("renovacoes","IdRenovacao",ref("IdInscricaoAntiga","inscricoes"),ref("IdInscricaoNova","inscricoes")),
  m("documentosEmitidos","Id",ref("CodAluno","alunos"))
 );
 public static Module get(String name){return ALL.stream().filter(m->m.name.equals(name)).findFirst().orElseThrow(()->new ApiException(400,"Módulo inválido: "+name));}
 private Modules(){}
}
