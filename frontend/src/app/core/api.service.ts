import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { Change, Session, WorkspaceData } from './models';

const KEYS: Record<string, string> = {
 anosLectivos:'Ano',escolas:'CodEscola',cursos:'CodCurso',classes:'IdClasse',materias:'IdMateria',
 funcionarios:'IdFuncionario',alunos:'IdAluno',turmas:'CodTurma',funcoes:'IdFuncao',atribuicoes:'IdAtribuicao',
 inscricoes:'IdInscricao',notas:'IdNota',exames:'IdExame',recursos:'IdRecurso',pagamentos:'IdPagamento',
 renovacoes:'IdRenovacao',documentosEmitidos:'Id',usuarios:'IdUsuario'
};
@Injectable({providedIn:'root'})
export class ApiService {
 private token = sessionStorage.getItem('sige_token') || '';
 private school = sessionStorage.getItem('sige_school') || '';
 readonly data = new BehaviorSubject<WorkspaceData | null>(null);
 readonly expired = new BehaviorSubject(false);
 constructor(private http: HttpClient) {}
 get hasSession(): boolean { return !!this.token; }
 private headers(): HttpHeaders {let headers=new HttpHeaders({Authorization: `Bearer ${this.token}`});return this.school?headers.set('X-School-Id',this.school):headers;}
 async login(username: string, password: string): Promise<WorkspaceData> {
  const result = await firstValueFrom(this.http.post<{token: string; user: Session}>('/api/auth/login',{username,password}));
  this.token=result.token;this.school='';sessionStorage.removeItem('sige_school');sessionStorage.setItem('sige_token',this.token);this.expired.next(false);
  try {return await this.load();} catch(error) {this.logout();throw error;}
 }
 async load(): Promise<WorkspaceData> { return this.publish(await this.request<WorkspaceData>('GET','/workspace')); }
 async backup(): Promise<WorkspaceData>{return this.request<WorkspaceData>('GET','/backup');}
 async selectSchool(school: string): Promise<WorkspaceData>{const previous=this.school;this.school=school||'*';try{const data=await this.load();sessionStorage.setItem('sige_school',this.school);return data;}catch(error){this.school=previous;throw error;}}
 publish(data: WorkspaceData): WorkspaceData {this.data.next(data);return data;}
 async commit(before: WorkspaceData, after: WorkspaceData): Promise<WorkspaceData> {
  const changes: Change[]=[];
  for(const [module,key] of Object.entries(KEYS)) {
   const original = new Map<string, any>((before[module] || []).map((item: any)=>[String(item[key]),item]));
   const current = new Map<string, any>((after[module] || []).map((item: any)=>[String(item[key]),item]));
   for(const [id,record] of current) if(JSON.stringify(original.get(id))!==JSON.stringify(record)) changes.push({module,kind:'upsert',id,record});
   for(const id of original.keys()) if(!current.has(id)) changes.push({module,kind:'delete',id});
  }
  const config=JSON.stringify(before.config)!==JSON.stringify(after.config)?after.config:null;
  if(!changes.length&&!config)return after;
  return this.publish(await this.request<WorkspaceData>('POST','/transactions',{revision:before.revision,changes,config}));
 }
 async exportRenewals(year: string): Promise<string>{return this.execute(this.http.get('/api/exports/renewals',{params:{year},headers:this.headers(),responseType:'text'}));}
 async renew(origin: string,destination: string): Promise<WorkspaceData>{return this.publish(await this.request<WorkspaceData>('POST','/renewals',{revision:this.data.value?.revision,origin,destination}));}
 async restore(data: WorkspaceData): Promise<WorkspaceData>{return this.publish(await this.request<WorkspaceData>('POST','/backup/restore',{revision:this.data.value?.revision,data}));}
 async reset(): Promise<WorkspaceData>{return this.publish(await this.request<WorkspaceData>('POST','/demo/reset',{revision:this.data.value?.revision}));}
 private async request<T>(method: string,path: string,body?: unknown): Promise<T>{
  return this.execute(this.http.request<T>(method,'/api'+path,{body,headers:this.headers()}));
 }
 private async execute<T>(request: Observable<T>): Promise<T>{
  try{return await firstValueFrom(request);}
  catch(error){if(error instanceof HttpErrorResponse&&error.status===401){this.logout();this.expired.next(true);}throw error;}
 }
 logout(): void {this.token='';this.school='';sessionStorage.removeItem('sige_token');sessionStorage.removeItem('sige_school');this.data.next(null);}
 error(error: unknown): string {
  if(error instanceof HttpErrorResponse){
   if(error.status===0||error.status>=502)return 'Não foi possível contactar o servidor. Os dados não foram gravados. Verifique a ligação e tente novamente.';
   let body=error.error;
   if(typeof body==='string'){try{body=JSON.parse(body);}catch{body=null;}}
   return body?.message || 'Não foi possível concluir a operação. Tente novamente.';
  }
  return error instanceof Error?error.message:'Não foi possível concluir a operação.';
 }
}
