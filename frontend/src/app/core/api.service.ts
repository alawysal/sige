import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
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
 readonly data = new BehaviorSubject<WorkspaceData | null>(null);
 readonly expired = new BehaviorSubject(false);
 constructor(private http: HttpClient) {}
 get hasSession(): boolean { return !!this.token; }
 private headers(): HttpHeaders { return new HttpHeaders({Authorization: `Bearer ${this.token}`}); }
 async login(username: string, password: string): Promise<WorkspaceData> {
  const result = await firstValueFrom(this.http.post<{token: string; user: Session}>('/api/auth/login',{username,password}));
  this.token=result.token;sessionStorage.setItem('sige_token',this.token);this.expired.next(false);
  try {return await this.load();} catch(error) {this.logout();throw error;}
 }
 async load(): Promise<WorkspaceData> { return this.publish(await this.request<WorkspaceData>('GET','/workspace')); }
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
 async exportRenewals(year: string): Promise<string>{return firstValueFrom(this.http.get('/api/exports/renewals',{params:{year},headers:this.headers(),responseType:'text'}));}
 async renew(origin: string,destination: string): Promise<WorkspaceData>{return this.publish(await this.request<WorkspaceData>('POST','/renewals',{revision:this.data.value?.revision,origin,destination}));}
 async restore(data: WorkspaceData): Promise<WorkspaceData>{return this.publish(await this.request<WorkspaceData>('POST','/backup/restore',{revision:this.data.value?.revision,data}));}
 async reset(): Promise<WorkspaceData>{return this.publish(await this.request<WorkspaceData>('POST','/demo/reset',{revision:this.data.value?.revision}));}
 private async request<T>(method: string,path: string,body?: unknown): Promise<T>{
  try{return await firstValueFrom(this.http.request<T>(method,'/api'+path,{body,headers:this.headers()}));}
  catch(error){if(error instanceof HttpErrorResponse&&error.status===401){this.logout();this.expired.next(true);}throw error;}
 }
 logout(): void {this.token='';sessionStorage.removeItem('sige_token');this.data.next(null);}
 error(error: unknown): string {
  if(error instanceof HttpErrorResponse){
   if(error.status===0||error.status>=502)return 'Não foi possível contactar o servidor. Os dados não foram gravados. Verifique a ligação e tente novamente.';
   return error.error?.message || 'Não foi possível concluir a operação. Tente novamente.';
  }
  return error instanceof Error?error.message:'Não foi possível concluir a operação.';
 }
}
