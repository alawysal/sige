import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from './core/api.service';
import { MENU, PERMISSOES, TITLES } from './core/navigation';
import { PromaxRenderer, WorkspaceData } from './core/models';
import { createPromaxRenderer } from './promax/promax-renderer';

interface DashboardSummary {
  alunosAtivos: number;
  professores: number;
  pagamentosTotais: number;
  inscricoesAtivas?: number;
  propinasEmDia?: number;
  aproveitamentoMedio?: number;
}

interface MenuItem {
  label: string;
  key: string;
  icon: string;
}

interface Student {
  id: string;
  nome: string;
  sexo: string;
  nascimento: string;
  encarregado: string;
  celular: string;
  turma: string;
  status: string;
}

interface Enrollment {
  id: number;
  aluno: string;
  classe: string;
  turma: string;
  curso: string;
  ano: string;
  valor: number;
  estado: string;
}

interface Payment {
  id: number;
  referencia: string;
  aluno: string;
  valor: number;
  data: string;
  estado: string;
}

interface Classroom {
  id: number;
  nome: string;
  nivel: string;
  director: string;
  capacidade: number;
  alunos: number;
  turno: string;
}

interface Course {
  id: number;
  nome: string;
  nivel: string;
  duracao: string;
  coordenador: string;
  alunos: number;
}

interface Subject {
  id: number;
  nome: string;
  docente: string;
  turma: string;
  trimestre: string;
  carga: string;
}

interface Report {
  id: number;
  titulo: string;
  tipo: string;
  periodo: string;
  estado: string;
  geradoEm: string;
}

interface Renewal {
  id: number;
  aluno: string;
  turmaAnterior: string;
  turmaNova: string;
  curso: string;
  valor: number;
  estado: string;
}

interface DocumentItem {
  id: number;
  nome: string;
  tipo: string;
  entidade: string;
  codigo: string;
  status: string;
}

interface GradeRecord {
  aluno: string;
  turma: string;
  trimestre1: number;
  trimestre2: number;
  exameFinal: number;
  recurso: number | null;
  situacao: string;
}

interface AcademicRule {
  sigla: string;
  passScore: number;
  negativeLimit: number;
  finalExamWeight: number;
  resourceAllowed: boolean;
}

type RoleKey = 'ADMIN' | 'DIRETOR' | 'SECRETARIA' | 'FINANCEIRO' | 'PROFESSOR' | 'PEDAGOGICO' | 'MINISTERIO';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'SIGE Nacional';
  loginError = '';
  isLoggedIn = false;
  currentModule = 'dashboard';
  modalOpen = false;
  modalTitle = '';
  modalBody = '';
  username = '';
  password = '';
  searchStudent = '';
  activeYear = '2026/2027';
  currentRole: RoleKey = 'ADMIN';
  db: WorkspaceData | null = null;
  loggingIn = false;
  busy = false;
  sidebarOpen = false;
  logoutOpen = false;
  view = 'dashboard';

  private ready = false;
  private renderer?: PromaxRenderer;
  private subscriptions = new Subscription();

  stats = [
    { title: 'Alunos ativos', value: '1.284', trend: '+8.4%', tone: 'blue' },
    { title: 'Matrículas', value: '246', trend: '+12.1%', tone: 'green' },
    { title: 'Propinas em dia', value: '91%', trend: '+3.2%', tone: 'purple' },
    { title: 'Aproveitamento', value: '87.6%', trend: '+1.8%', tone: 'orange' }
  ];

  alunos: Student[] = [];
  inscricoes: Enrollment[] = [];
  pagamentos: Payment[] = [];
  turmas: Classroom[] = [];
  cursos: Course[] = [];
  materias: Subject[] = [];
  relatorios: Report[] = [];
  renovacoes: Renewal[] = [];
  documentos: DocumentItem[] = [];
  avaliacoes: GradeRecord[] = [];
  regrasAcademicas: Record<string, AcademicRule> = {};
  alertas: string[] = [];

  menu: MenuItem[] = [
    { label: 'Painel Principal', key: 'dashboard', icon: '📊' },
    { label: 'Alunos', key: 'alunos', icon: '🧑‍🎓' },
    { label: 'Matrículas', key: 'inscricoes', icon: '📝' },
    { label: 'Renovações', key: 'renovacoes', icon: '🔄' },
    { label: 'Turmas', key: 'turmas', icon: '👥' },
    { label: 'Classes', key: 'classes', icon: '🏷️' },
    { label: 'Cursos', key: 'cursos', icon: '🎓' },
    { label: 'Matérias', key: 'materias', icon: '📚' },
    { label: 'Notas', key: 'notas', icon: '✍️' },
    { label: 'Pagamentos', key: 'pagamentos', icon: '💳' },
    { label: 'Relatórios', key: 'relatorios', icon: '📈' },
    { label: 'Documentos', key: 'documentos', icon: '📜' }
  ];

  summary = {
    trimestres: 3,
    exames: 18,
    recursos: 7,
    transacoes: 128
  };

  constructor(
    private http: HttpClient,
    public api: ApiService,
    private host: ElementRef<HTMLElement>,
    private router: Router
  ) {
    this.subscriptions.add(api.data.subscribe(data => {
      this.db = data;
      this.isLoggedIn = !!data;
      if (!data) {
        this.renderer?.destroy();
        this.renderer = undefined;
      } else if (this.ready && !this.renderer) {
        this.connect();
      }
    }));

    this.subscriptions.add(api.expired.subscribe(expired => {
      if (expired) {
        this.loginError = 'A sessão expirou. Inicie sessão novamente.';
        void this.router.navigateByUrl('/sige');
      }
    }));

    this.subscriptions.add(router.events.subscribe(event => {
      if (!(event instanceof NavigationEnd)) return;
      const match = event.urlAfterRedirects.match(/^\/sige\/app\/([^/?]+)/);
      this.view = match ? decodeURIComponent(match[1]) : 'dashboard';
      this.currentModule = this.view;
      if (this.db && !this.allowed(this.view)) {
        void this.router.navigateByUrl('/sige/app/dashboard');
        return;
      }
      this.renderer?.show(this.view);
    }));
  }

  ngOnInit(): void {
    this.refreshRole();
  }

  async ngAfterViewInit(): Promise<void> {
    this.ready = true;
    if (!this.api.hasSession) return;
    this.loggingIn = true;
    try {
      await this.api.load();
      if (!this.router.url.startsWith('/sige/app/')) {
        await this.router.navigateByUrl('/sige/app/dashboard');
      }
    } catch (error) {
      this.loginError = this.api.error(error);
    } finally {
      this.loggingIn = false;
    }
  }

  private connect(): void {
    if (!this.db) return;
    this.username = this.db.session.Usuario;
    this.renderer = createPromaxRenderer(this.host.nativeElement, {
      data: this.db,
      commit: (before, after) => this.api.commit(before, after),
      renew: (origin, destination) => this.api.renew(origin, destination),
      restore: data => this.api.restore(data),
      reset: () => this.api.reset(),
      exportRenewals: year => this.api.exportRenewals(year),
      backup: () => this.api.backup(),
      changed: data => { this.db = data; },
      navigate: view => { void this.router.navigate(['/sige/app', view]); },
      busy: value => { this.busy = value; },
      error: error => this.api.error(error)
    });
    if (!this.allowed(this.view)) {
      this.view = 'dashboard';
      this.currentModule = 'dashboard';
      void this.router.navigateByUrl('/sige/app/dashboard');
    }
    this.renderer.show(this.view);
  }

  allowed(view: string): boolean {
    const permissions = PERMISSOES[this.db?.session.Perfil || ''];
    return permissions === '*' || !!permissions?.includes(view);
  }

  get navigation() {
    const menu = MENU.filter(item => this.allowed(item.k));
    return menu.map((item, index) => ({
      ...item,
      heading: index === 0 || menu[index - 1].g !== item.g
    }));
  }

  get pageTitle(): string[] {
    return TITLES[this.view] || TITLES['dashboard'];
  }

  get initials(): string {
    return (this.db?.session.Nome || '?').trim().split(/\s+/).slice(0, 2)
      .map(word => word[0]).join('').toUpperCase();
  }

  async selectSchool(event: Event): Promise<void> {
    const school = (event.target as HTMLSelectElement).value;
    this.busy = true;
    try {
      await this.api.selectSchool(school);
      this.renderer?.destroy();
      this.renderer = undefined;
      this.connect();
    } catch (error) {
      this.loginError = this.api.error(error);
    } finally {
      this.busy = false;
    }
  }

  ngOnDestroy(): void {
    this.renderer?.destroy();
    this.subscriptions.unsubscribe();
  }

  private initDemoData(): void {
    const saved = localStorage.getItem('escola_demo_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      this.alunos = parsed.alunos || [];
      this.inscricoes = parsed.inscricoes || [];
      this.pagamentos = parsed.pagamentos || [];
      this.turmas = parsed.turmas || [];
      this.cursos = parsed.cursos || [];
      this.materias = parsed.materias || [];
      this.relatorios = parsed.relatorios || [];
      this.renovacoes = parsed.renovacoes || [];
      this.documentos = parsed.documentos || [];
      this.avaliacoes = parsed.avaliacoes || [];
      this.regrasAcademicas = parsed.regrasAcademicas || {};
      this.alertas = parsed.alertas || [];
      return;
    }

    this.alunos = [
      { id: 'ALU0001', nome: 'Ana Silva', sexo: 'F', nascimento: '2012-05-14', encarregado: 'Paulo Silva', celular: '+258 84 123 4567', turma: '10A', status: 'Aprovada' },
      { id: 'ALU0002', nome: 'Bruno Costa', sexo: 'M', nascimento: '2011-08-20', encarregado: 'Marina Costa', celular: '+258 82 234 5678', turma: '11B', status: 'Em recurso' },
      { id: 'ALU0003', nome: 'Carla Mendes', sexo: 'F', nascimento: '2013-01-09', encarregado: 'Rui Mendes', celular: '+258 84 345 6789', turma: '9C', status: 'Aprovada' },
      { id: 'ALU0004', nome: 'Dário Lopes', sexo: 'M', nascimento: '2010-11-28', encarregado: 'Lia Lopes', celular: '+258 86 456 7890', turma: '12A', status: 'Regular' },
      { id: 'ALU0005', nome: 'Estela Nhampossa', sexo: 'F', nascimento: '2012-09-17', encarregado: 'Mário Nhampossa', celular: '+258 82 567 8901', turma: '9B', status: 'Aprovada' }
    ];

    this.inscricoes = [
      { id: 101, aluno: 'Ana Silva', classe: '10ª Classe', turma: '10A', curso: 'Informática de Gestão', ano: '2026/2027', valor: 5400, estado: 'Matriculado' },
      { id: 102, aluno: 'Bruno Costa', classe: '11ª Classe', turma: '11B', curso: 'Contabilidade e Gestão', ano: '2026/2027', valor: 6000, estado: 'Pendente' },
      { id: 103, aluno: 'Carla Mendes', classe: '9ª Classe', turma: '9C', curso: 'Informática de Gestão', ano: '2026/2027', valor: 4500, estado: 'Matriculado' },
      { id: 104, aluno: 'Dário Lopes', classe: '12ª Classe', turma: '12A', curso: 'Electrónica e Telecomunicações', ano: '2026/2027', valor: 9600, estado: 'Matriculado' }
    ];

    this.pagamentos = [
      { id: 1, referencia: 'Propina - Setembro', aluno: 'Ana Silva', valor: 1250, data: '2026-09-12', estado: 'Pago' },
      { id: 2, referencia: 'Matrícula - 2026', aluno: 'Bruno Costa', valor: 850, data: '2026-09-06', estado: 'Pendente' },
      { id: 3, referencia: 'Livro escolar', aluno: 'Carla Mendes', valor: 420, data: '2026-09-08', estado: 'Pago' },
      { id: 4, referencia: 'Exame final', aluno: 'Dário Lopes', valor: 300, data: '2026-08-29', estado: 'Pendente' }
    ];

    this.turmas = [
      { id: 1, nome: '10A', nivel: '10ª Classe', director: 'Marta Tamele', capacidade: 35, alunos: 32, turno: 'Manhã' },
      { id: 2, nome: '11B', nivel: '11ª Classe', director: 'Leonardo Nhatumbo', capacidade: 38, alunos: 30, turno: 'Tarde' },
      { id: 3, nome: '12A', nivel: '12ª Classe', director: 'Célia Muianga', capacidade: 40, alunos: 28, turno: 'Manhã' }
    ];

    this.cursos = [
      { id: 1, nome: 'Informática de Gestão', nivel: 'Secundário', duracao: '3 anos', coordenador: 'José Mucavel', alunos: 248 },
      { id: 2, nome: 'Contabilidade e Gestão', nivel: 'Secundário', duracao: '3 anos', coordenador: 'Ruth Langa', alunos: 186 },
      { id: 3, nome: 'Electrónica e Telecomunicações', nivel: 'Técnico', duracao: '4 anos', coordenador: 'Aníbal Mário', alunos: 134 }
    ];

    this.materias = [
      { id: 1, nome: 'Matemática', docente: 'Prof. Ana Mário', turma: '10A', trimestre: 'Trimestre I', carga: '4h/semana' },
      { id: 2, nome: 'Física', docente: 'Prof. Daniel Mussa', turma: '11B', trimestre: 'Trimestre II', carga: '3h/semana' },
      { id: 3, nome: 'Química', docente: 'Prof. Lúcia Chissico', turma: '12A', trimestre: 'Trimestre III', carga: '3h/semana' },
      { id: 4, nome: 'Informática', docente: 'Prof. Aquila Nhampossa', turma: '10A', trimestre: 'Trimestre I', carga: '5h/semana' }
    ];

    this.relatorios = [
      { id: 1, titulo: 'Pauta de turma', tipo: 'Académico', periodo: 'Trimestre I', estado: 'Disponível', geradoEm: '2026-09-10' },
      { id: 2, titulo: 'Recursos académicos', tipo: 'Acompanhamento', periodo: 'Final', estado: 'Pendente', geradoEm: '2026-09-17' },
      { id: 3, titulo: 'Propinas por turma', tipo: 'Financeiro', periodo: 'Mensal', estado: 'Disponível', geradoEm: '2026-09-20' }
    ];

    this.renovacoes = [
      { id: 1, aluno: 'Ana Silva', turmaAnterior: '9A', turmaNova: '10A', curso: 'Informática de Gestão', valor: 5400, estado: 'Confirmada' },
      { id: 2, aluno: 'Bruno Costa', turmaAnterior: '10B', turmaNova: '11B', curso: 'Contabilidade e Gestão', valor: 6000, estado: 'Pendente' },
      { id: 3, aluno: 'Carla Mendes', turmaAnterior: '8C', turmaNova: '9C', curso: 'Informática de Gestão', valor: 4500, estado: 'Confirmada' }
    ];

    this.documentos = [
      { id: 1, nome: 'Recibo de propina', tipo: 'Pagamento', entidade: 'Financeiro', codigo: 'RC-2026-001', status: 'Emitido' },
      { id: 2, nome: 'Declaração de matrícula', tipo: 'Escolar', entidade: 'Secretaria', codigo: 'DM-2026-024', status: 'Pronto' },
      { id: 3, nome: 'Certificado de aproveitamento', tipo: 'Académico', entidade: 'Direção', codigo: 'CA-2026-017', status: 'Aprovado' }
    ];

    this.avaliacoes = [
      { aluno: 'Ana Silva', turma: '10A', trimestre1: 17, trimestre2: 18, exameFinal: 16, recurso: null, situacao: 'Aprovada' },
      { aluno: 'Bruno Costa', turma: '11B', trimestre1: 12, trimestre2: 14, exameFinal: 13, recurso: 15, situacao: 'Em recurso' },
      { aluno: 'Carla Mendes', turma: '9C', trimestre1: 16, trimestre2: 18, exameFinal: 17, recurso: null, situacao: 'Aprovada' },
      { aluno: 'Dário Lopes', turma: '12A', trimestre1: 14, trimestre2: 15, exameFinal: 14, recurso: null, situacao: 'Regular' },
      { aluno: 'Estela Nhampossa', turma: '9B', trimestre1: 18, trimestre2: 17, exameFinal: 18, recurso: null, situacao: 'Aprovada' }
    ];

    this.regrasAcademicas = {
      '10A': { sigla: '10A', passScore: 10, negativeLimit: 2, finalExamWeight: 0.3, resourceAllowed: true },
      '11B': { sigla: '11B', passScore: 10, negativeLimit: 2, finalExamWeight: 0.35, resourceAllowed: true },
      '12A': { sigla: '12A', passScore: 10, negativeLimit: 3, finalExamWeight: 0.4, resourceAllowed: true },
      '9B': { sigla: '9B', passScore: 9, negativeLimit: 2, finalExamWeight: 0.25, resourceAllowed: true },
      '9C': { sigla: '9C', passScore: 9, negativeLimit: 2, finalExamWeight: 0.25, resourceAllowed: true }
    };

    this.alertas = [
      'Revisão de horários dos professores da turma 10A.',
      '3 alunos requerem exame de recurso em Matemática.',
      'Pagamentos pendentes da turma 12A.',
      'Renovações automáticas previstas para o próximo ano letivo.'
    ];

    this.persistDemoData();
  }

  private persistDemoData(): void {
    localStorage.setItem('escola_demo_data', JSON.stringify({
      alunos: this.alunos,
      inscricoes: this.inscricoes,
      pagamentos: this.pagamentos,
      turmas: this.turmas,
      cursos: this.cursos,
      materias: this.materias,
      relatorios: this.relatorios,
      renovacoes: this.renovacoes,
      documentos: this.documentos,
      avaliacoes: this.avaliacoes,
      regrasAcademicas: this.regrasAcademicas,
      alertas: this.alertas
    }));
  }

  private loadDashboard(): void {
    const token = localStorage.getItem('escola_token');
    const headers = token
      ? new HttpHeaders({ Authorization: `Bearer ${token}` })
      : new HttpHeaders();

    this.http.get<DashboardSummary>('http://localhost:8080/api/dashboard', { headers }).subscribe({
      next: (summary) => {
        this.stats[0].value = summary.alunosAtivos.toLocaleString('pt-PT');
        this.stats[1].value = String(summary.pagamentosTotais || summary.inscricoesAtivas || 0);
        this.stats[2].value = `${summary.propinasEmDia ?? 91}%`;
        this.stats[3].value = `${summary.aproveitamentoMedio ?? 87}%`;
      },
      error: () => {
        this.stats[0].value = String(this.alunos.length);
        this.stats[1].value = String(this.inscricoes.length);
        this.stats[2].value = '91%';
        this.stats[3].value = '87.6%';
      }
    });
  }

  setModule(key: string): void {
    this.currentModule = key;
    const labels: Record<string, string> = {
      dashboard: 'Painel Principal',
      alunos: 'Alunos',
      inscricoes: 'Matrículas e Inscrições',
      renovacoes: 'Renovações',
      turmas: 'Turmas',
      classes: 'Classes',
      cursos: 'Cursos',
      materias: 'Matérias',
      notas: 'Lançamento de Notas',
      pagamentos: 'Pagamentos',
      relatorios: 'Relatórios',
      documentos: 'Documentos Oficiais'
    };
    this.title = labels[key] ?? 'SIGE Nacional';
  }

  async login(): Promise<void> {
    if (this.loggingIn) return;
    this.loginError = '';
    this.loggingIn = true;
    try {
      await this.api.login(this.username.trim(), this.password);
      this.password = '';
      await this.router.navigateByUrl('/sige/app/dashboard');
    } catch (error) {
      this.loginError = this.api.error(error);
    } finally {
      this.loggingIn = false;
    }
  }

  refreshRole(): void {
    const normalized = (this.db?.session.Perfil || '').toUpperCase();
    const roleMap: Record<string, RoleKey> = {
      ADMIN: 'ADMIN',
      DIRETOR: 'DIRETOR',
      DIRECAO: 'DIRETOR',
      SECRETARIA: 'SECRETARIA',
      SECRETARIO: 'SECRETARIA',
      FINANCEIRO: 'FINANCEIRO',
      PROFESSOR: 'PROFESSOR',
      PEDAGOGICO: 'PEDAGOGICO',
      MINISTERIO: 'MINISTERIO'
    };
    this.currentRole = roleMap[normalized] ?? 'SECRETARIA';
  }

  get currentRoleLabel(): string {
    return {
      ADMIN: 'Administrador',
      DIRETOR: 'Diretor',
      SECRETARIA: 'Secretaria',
      FINANCEIRO: 'Financeiro',
      PROFESSOR: 'Professor',
      PEDAGOGICO: 'Pedagógico',
      MINISTERIO: 'Ministério'
    }[this.currentRole] ?? 'Secretaria';
  }

  hasAccess(roles: RoleKey[]): boolean {
    return roles.includes(this.currentRole) || this.currentRole === 'ADMIN';
  }

  logout(): void {
    this.logoutOpen = false;
    this.api.logout();
    this.host.nativeElement.querySelector('#modalRoot')?.replaceChildren();
    this.host.nativeElement.querySelector('#printArea')?.replaceChildren();
    void this.router.navigateByUrl('/sige');
  }

  openModal(): void {
    this.modalTitle = 'Nova matrícula';
    this.modalBody = `
      <div class="form-grid g2">
        <div class="campo"><label>Aluno</label><input value="Ana Silva" /></div>
        <div class="campo"><label>Turma</label><select><option>10A</option><option>11B</option><option>12A</option></select></div>
        <div class="campo"><label>Curso</label><select><option>Informática</option><option>Contabilidade</option></select></div>
        <div class="campo"><label>Ano lectivo</label><input value="2026/2027" /></div>
        <div class="campo full"><label>Observação</label><textarea>Renovação automática por ano lectivo.</textarea></div>
      </div>
    `;
    this.modalOpen = true;
  }

  openDocumentModal(doc: DocumentItem): void {
    this.modalTitle = doc.nome;
    this.modalBody = `
      <div class="form-grid g2">
        <div class="campo"><label>Documento</label><input value="${doc.nome}" /></div>
        <div class="campo"><label>Código</label><input value="${doc.codigo}" /></div>
        <div class="campo"><label>Tipo</label><input value="${doc.tipo}" /></div>
        <div class="campo"><label>Entidade</label><input value="${doc.entidade}" /></div>
        <div class="campo full"><label>Observação</label><textarea>Documento validado e aprovado para impressão oficial.</textarea></div>
      </div>
    `;
    this.modalOpen = true;
  }

  printDocument(doc: DocumentItem): void {
    this.modalTitle = `Imprimir ${doc.nome}`;
    this.modalBody = `
      <div class="print-doc">
        <h3 style="margin:0 0 10px; color:#0b3d6b;">${doc.nome}</h3>
        <p style="margin:0 0 10px; color:#334155;">Tipo: ${doc.tipo}</p>
        <p style="margin:0 0 10px; color:#334155;">Código: ${doc.codigo}</p>
        <p style="margin:0 0 10px; color:#334155;">Entidade: ${doc.entidade}</p>
        <p style="margin:0; color:#334155;">Emitido em ${new Date().toLocaleDateString('pt-PT')} e pronto para impressão oficial.</p>
      </div>
    `;
    this.modalOpen = true;
    setTimeout(() => window.print(), 150);
  }

  closeModal(): void {
    this.modalOpen = false;
  }

  get filteredAlunos(): Student[] {
    const term = this.searchStudent.trim().toLowerCase();
    if (!term) {
      return this.alunos;
    }

    return this.alunos.filter((aluno) =>
      aluno.nome.toLowerCase().includes(term)
      || aluno.id.toLowerCase().includes(term)
      || aluno.encarregado.toLowerCase().includes(term)
    );
  }

  addAluno(): void {
    const nextId = this.alunos.length + 1;
    const novo: Student = {
      id: `ALU${String(nextId).padStart(4, '0')}`,
      nome: 'Novo aluno',
      sexo: 'M',
      nascimento: '2012-01-01',
      encarregado: 'Encarregado',
      celular: '+258 84 000 0000',
      turma: '10A',
      status: 'Regular'
    };
    this.alunos.push(novo);
    this.persistDemoData();
    this.loadDashboard();
  }

  addPagamento(): void {
    const item: Payment = {
      id: Date.now(),
      referencia: 'Propina trimestral',
      aluno: this.alunos[0]?.nome ?? 'Aluno',
      valor: 1500,
      data: new Date().toISOString().slice(0, 10),
      estado: 'Pago'
    };
    this.pagamentos.unshift(item);
    this.persistDemoData();
    this.loadDashboard();
  }

  get totalRecebido(): number {
    return this.pagamentos.reduce((sum, pagamento) => sum + pagamento.valor, 0);
  }

  get aprovados(): number {
    return this.alunos.filter((aluno) => aluno.status === 'Aprovada').length;
  }

  get totalMatriculas(): number {
    return this.inscricoes.length;
  }

  get totalRenovacoes(): number {
    return this.renovacoes.filter((item) => item.estado === 'Confirmada').length;
  }

  get totalDocumentos(): number {
    return this.documentos.length;
  }

  get avaliacoesProcessadas(): Array<GradeRecord & { media: number; notaFinal: number; situacaoReal: string }> {
    return this.avaliacoes.map((record) => {
      const regra = this.regrasAcademicas[record.turma] ?? {
        sigla: record.turma,
        passScore: 10,
        negativeLimit: 2,
        finalExamWeight: 0.3,
        resourceAllowed: true
      };

      const media = Number((((record.trimestre1 + record.trimestre2 + record.exameFinal) / 3) || 0).toFixed(1));
      const notaFinal = record.recurso != null ? Math.max(record.exameFinal, record.recurso) : record.exameFinal;
      const situacaoReal = notaFinal >= regra.passScore ? 'Aprovada' : (record.recurso != null ? 'Em recurso' : 'Regular');

      return {
        ...record,
        media,
        notaFinal,
        situacaoReal
      };
    });
  }

  get professoresResumo(): number {
    return new Set(this.materias.map((materia) => materia.docente)).size;
  }

  updateAvaliacao(aluno: string, campo: 'trimestre1' | 'trimestre2' | 'exameFinal' | 'recurso', valor: number): void {
    const alvo = this.avaliacoes.find((item) => item.aluno === aluno);
    if (!alvo) {
      return;
    }

    const parsed = Number(valor);
    if (!Number.isFinite(parsed)) {
      return;
    }

    alvo[campo] = parsed;
    alvo.situacao = this.resolveSituacao(alvo);
    this.persistDemoData();
  }

  resolveSituacao(record: GradeRecord): string {
    const regra = this.regrasAcademicas[record.turma] ?? { passScore: 10, negativeLimit: 2, finalExamWeight: 0.3, resourceAllowed: true };
    const notaFinal = record.recurso != null ? Math.max(record.exameFinal, record.recurso) : record.exameFinal;
    if (notaFinal >= regra.passScore) {
      return 'Aprovada';
    }
    if (record.recurso != null && regra.resourceAllowed) {
      return 'Em recurso';
    }
    return 'Regular';
  }

  confirmarRenovacao(id: number): void {
    const item = this.renovacoes.find((renovacao) => renovacao.id === id);
    if (!item) {
      return;
    }
    item.estado = 'Confirmada';
    this.persistDemoData();
  }

  recusarRenovacao(id: number): void {
    const item = this.renovacoes.find((renovacao) => renovacao.id === id);
    if (!item) {
      return;
    }
    item.estado = 'Pendente';
    this.persistDemoData();
  }

  atualizarPagamento(id: number): void {
    const item = this.pagamentos.find((pagamento) => pagamento.id === id);
    if (!item) {
      return;
    }
    item.estado = item.estado === 'Pago' ? 'Pendente' : 'Pago';
    this.persistDemoData();
    this.loadDashboard();
  }

  gerarDocumento(nome: string, tipo: string): void {
    const codigo = `${tipo.slice(0, 2).toUpperCase()}-${new Date().getFullYear()}-${String(this.documentos.length + 1).padStart(3, '0')}`;
    this.documentos.unshift({
      id: Date.now(),
      nome,
      tipo,
      entidade: this.currentRoleLabel,
      codigo,
      status: 'Pronto'
    });
    this.persistDemoData();
  }
}
