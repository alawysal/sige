import { MenuItem } from "./models";
export const MENU: MenuItem[] = [
  {
    "k": "dashboard",
    "l": "Painel Principal",
    "i": "📊",
    "g": "Principal"
  },
  {
    "k": "alunos",
    "l": "Alunos",
    "i": "🧑‍🎓",
    "g": "Pedagógico"
  },
  {
    "k": "inscricoes",
    "l": "Matrículas e Inscrições",
    "i": "📝",
    "g": "Pedagógico"
  },
  {
    "k": "renovacoes",
    "l": "Renovações",
    "i": "🔄",
    "g": "Pedagógico"
  },
  {
    "k": "turmas",
    "l": "Turmas",
    "i": "👥",
    "g": "Pedagógico"
  },
  {
    "k": "classes",
    "l": "Classes",
    "i": "🏷️",
    "g": "Pedagógico"
  },
  {
    "k": "cursos",
    "l": "Cursos",
    "i": "🎓",
    "g": "Pedagógico"
  },
  {
    "k": "materias",
    "l": "Matérias",
    "i": "📚",
    "g": "Pedagógico"
  },
  {
    "k": "minhas-turmas",
    "l": "Minhas Turmas",
    "i": "👨‍🏫",
    "g": "Docência"
  },
  {
    "k": "ficha-avaliacao",
    "l": "Ficha de Avaliação",
    "i": "📋",
    "g": "Docência"
  },
  {
    "k": "notas",
    "l": "Lançamento de Notas",
    "i": "✍️",
    "g": "Avaliação"
  },
  {
    "k": "exames-finais",
    "l": "Exames Finais",
    "i": "🎯",
    "g": "Avaliação"
  },
  {
    "k": "exames-recurso",
    "l": "Provas de Recurso",
    "i": "🔁",
    "g": "Avaliação"
  },
  {
    "k": "pautas",
    "l": "Pautas",
    "i": "📄",
    "g": "Avaliação"
  },
  {
    "k": "boletins",
    "l": "Boletins de Notas",
    "i": "🧾",
    "g": "Avaliação"
  },
  {
    "k": "funcionarios",
    "l": "Funcionários",
    "i": "👔",
    "g": "Recursos Humanos"
  },
  {
    "k": "funcoes",
    "l": "Funções",
    "i": "💼",
    "g": "Recursos Humanos"
  },
  {
    "k": "atribuicoes",
    "l": "Atribuições",
    "i": "🗂️",
    "g": "Recursos Humanos"
  },
  {
    "k": "pagamentos",
    "l": "Pagamentos / Propinas",
    "i": "💳",
    "g": "Financeiro"
  },
  {
    "k": "recibos",
    "l": "Recibos",
    "i": "🧾",
    "g": "Financeiro"
  },
  {
    "k": "dividas",
    "l": "Alunos com Dívidas",
    "i": "⚠️",
    "g": "Financeiro"
  },
  {
    "k": "documentos",
    "l": "Documentos Oficiais",
    "i": "📜",
    "g": "Documentação"
  },
  {
    "k": "exportar",
    "l": "Exportação de Alunos",
    "i": "📤",
    "g": "Documentação"
  },
  {
    "k": "relatorios",
    "l": "Relatórios",
    "i": "📈",
    "g": "Documentação"
  },
  {
    "k": "escolas",
    "l": "Escolas",
    "i": "🏫",
    "g": "Configurações"
  },
  {
    "k": "usuarios",
    "l": "Utilizadores",
    "i": "🔐",
    "g": "Configurações"
  },
  {
    "k": "anos-lectivos",
    "l": "Anos Lectivos",
    "i": "📅",
    "g": "Configurações"
  },
  {
    "k": "config",
    "l": "Configurações",
    "i": "⚙️",
    "g": "Configurações"
  }
];
export const TITLES: Record<string, string[]> = {
  "dashboard": [
    "Painel Principal",
    "Visão geral da instituição"
  ],
  "alunos": [
    "Alunos",
    "Gestão completa dos alunos"
  ],
  "inscricoes": [
    "Matrículas e Inscrições",
    "Registo e renovação por ano lectivo"
  ],
  "renovacoes": [
    "Renovações",
    "Renovação plurianual de matrículas"
  ],
  "turmas": [
    "Turmas",
    "Organização por classe, curso e turno"
  ],
  "classes": [
    "Classes",
    "Taxas, propinas e regras de aprovação"
  ],
  "cursos": [
    "Cursos",
    "Oferta formativa"
  ],
  "materias": [
    "Matérias",
    "Disciplinas curriculares"
  ],
  "minhas-turmas": [
    "Minhas Turmas",
    "Turmas e disciplinas que lecciona"
  ],
  "ficha-avaliacao": [
    "Ficha de Avaliação",
    "Ficha da sua turma por disciplina"
  ],
  "notas": [
    "Lançamento de Notas",
    "Avaliações trimestrais (MAC · NPP · NPT) — inteiros 0–20"
  ],
  "exames-finais": [
    "Exames Finais",
    "Cotações independentes"
  ],
  "exames-recurso": [
    "Provas de Recurso",
    "Avaliação de recurso para alunos elegíveis"
  ],
  "pautas": [
    "Pautas",
    "Pauta por turma, período e matéria"
  ],
  "boletins": [
    "Boletins de Notas",
    "Emissão individual de boletins"
  ],
  "funcionarios": [
    "Funcionários",
    "Corpo docente e administrativo"
  ],
  "funcoes": [
    "Funções",
    "Carreira dos funcionários"
  ],
  "atribuicoes": [
    "Atribuições de Docência",
    "Ligação professor ↔ turma ↔ matéria"
  ],
  "pagamentos": [
    "Pagamentos / Propinas",
    "Registo de recebimentos"
  ],
  "recibos": [
    "Recibos",
    "Reimpressão de comprovativos"
  ],
  "dividas": [
    "Alunos com Dívidas",
    "Propinas em atraso agrupadas por turma"
  ],
  "documentos": [
    "Documentos Oficiais",
    "Declarações, certificados e diplomas"
  ],
  "exportar": [
    "Exportação de Alunos",
    "Avaliados · Propinas em dia · Pendente"
  ],
  "relatorios": [
    "Relatórios",
    "Mapas de apoio à decisão"
  ],
  "escolas": [
    "Escolas",
    "Unidades escolares"
  ],
  "usuarios": [
    "Utilizadores",
    "Contas e privilégios"
  ],
  "anos-lectivos": [
    "Anos Lectivos",
    "Gestão plurianual"
  ],
  "config": [
    "Configurações",
    "Parâmetros do sistema"
  ]
};
export const PERMISSOES: Record<string, string | string[]> = {
  "Administrador": "*",
  "Director": [
    "dashboard",
    "alunos",
    "inscricoes",
    "renovacoes",
    "turmas",
    "classes",
    "cursos",
    "materias",
    "funcionarios",
    "funcoes",
    "atribuicoes",
    "notas",
    "exames-finais",
    "exames-recurso",
    "pautas",
    "boletins",
    "pagamentos",
    "recibos",
    "documentos",
    "relatorios",
    "exportar",
    "dividas",
    "anos-lectivos",
    "escolas"
  ],
  "Secretaria": [
    "dashboard",
    "alunos",
    "inscricoes",
    "renovacoes",
    "turmas",
    "classes",
    "cursos",
    "materias",
    "funcionarios",
    "funcoes",
    "recibos",
    "documentos",
    "boletins",
    "pautas",
    "relatorios",
    "exportar",
    "dividas"
  ],
  "Financeiro": [
    "dashboard",
    "pagamentos",
    "recibos",
    "alunos",
    "inscricoes",
    "classes",
    "relatorios",
    "dividas"
  ],
  "Professor": [
    "dashboard",
    "minhas-turmas",
    "ficha-avaliacao",
    "notas",
    "alunos"
  ]
};
