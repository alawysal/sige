import { AfterViewInit, Component, ElementRef, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from './core/api.service';
import { MENU, PERMISSOES, TITLES } from './core/navigation';
import { PromaxRenderer, WorkspaceData } from './core/models';
import { createPromaxRenderer } from './promax/promax-renderer';

@Component({selector:'app-root',templateUrl:'./app.component.html'})
export class AppComponent implements AfterViewInit, OnDestroy {
 db: WorkspaceData | null=null;
 username='';password='';loginError='';loggingIn=false;busy=false;sidebarOpen=false;logoutOpen=false;
 view='dashboard';private ready=false;private renderer?: PromaxRenderer;private subscriptions=new Subscription();
 readonly accounts=[
  {icon:'👑',user:'admin',password:'admin123',label:'Administrador'},
  {icon:'🎯',user:'diretor',password:'dir123',label:'Director'},
  {icon:'📋',user:'secretaria',password:'sec123',label:'Secretaria'},
  {icon:'💰',user:'financeiro',password:'fin123',label:'Financeiro'},
  {icon:'👨‍🏫',user:'professor',password:'prof123',label:'Professor'},
  {icon:'👩‍🏫',user:'prof2',password:'prof123',label:'Professor (Matemática)'}
 ];
 constructor(public api: ApiService,private host: ElementRef<HTMLElement>,private router: Router){
  this.subscriptions.add(api.data.subscribe(data=>{this.db=data;if(!data){this.renderer?.destroy();this.renderer=undefined;}else if(this.ready&&!this.renderer)this.connect();}));
  this.subscriptions.add(api.expired.subscribe(expired=>{if(expired){this.loginError='A sessão expirou. Inicie sessão novamente.';void this.router.navigateByUrl('/sige');}}));
  this.subscriptions.add(router.events.subscribe(event=>{if(event instanceof NavigationEnd){const match=event.urlAfterRedirects.match(/^\/sige\/app\/([^/?]+)/);this.view=match?decodeURIComponent(match[1]):'dashboard';if(this.db&&!this.allowed(this.view)){void this.router.navigateByUrl('/sige/app/dashboard');return;}this.renderer?.show(this.view);}}));
 }
 async ngAfterViewInit(): Promise<void>{this.ready=true;if(this.api.hasSession){this.loggingIn=true;try{await this.api.load();if(!this.router.url.startsWith('/sige/app/'))await this.router.navigateByUrl('/sige/app/dashboard');}catch(error){this.loginError=this.api.error(error);}finally{this.loggingIn=false;}}}
 private connect(): void {
  if(!this.db)return;
  this.renderer=createPromaxRenderer(this.host.nativeElement,{
   data:this.db,commit:(before,after)=>this.api.commit(before,after),renew:(o,d)=>this.api.renew(o,d),restore:data=>this.api.restore(data),reset:()=>this.api.reset(),exportRenewals:year=>this.api.exportRenewals(year),
   changed:data=>{this.db=data;},navigate:view=>{void this.router.navigate(['/sige/app',view]);},busy:value=>{this.busy=value;},error:error=>this.api.error(error)
  });
  this.renderer.show(this.allowed(this.view)?this.view:'dashboard');
 }
 async login(): Promise<void>{
  if(this.loggingIn)return;this.loginError='';this.loggingIn=true;
  try{await this.api.login(this.username.trim(),this.password);this.password='';await this.router.navigateByUrl('/sige/app/dashboard');}
  catch(error){this.loginError=this.api.error(error);}finally{this.loggingIn=false;}
 }
 quickLogin(user: string,password: string): void{this.username=user;this.password=password;void this.login();}
 allowed(view: string): boolean{const p=PERMISSOES[this.db?.session.Perfil||''];return p==='*'||!!p?.includes(view);}
 get navigation(){const menu=MENU.filter(m=>this.allowed(m.k));return menu.map((m,index)=>({...m,heading:index===0||menu[index-1].g!==m.g}));}
 get title(): string[]{return TITLES[this.view]||TITLES['dashboard'];}
 get initials(): string{return (this.db?.session.Nome||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase();}
 logout(): void{this.logoutOpen=false;this.api.logout();this.host.nativeElement.querySelector('#modalRoot')?.replaceChildren();this.host.nativeElement.querySelector('#printArea')?.replaceChildren();void this.router.navigateByUrl('/sige');}
 ngOnDestroy(): void{this.renderer?.destroy();this.subscriptions.unsubscribe();}
}
