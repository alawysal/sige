import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
describe('Autenticação SIGE',()=>{
 beforeEach(()=>{sessionStorage.removeItem('sige_token');TestBed.configureTestingModule({imports:[RouterTestingModule,HttpClientTestingModule,FormsModule],declarations:[AppComponent]});});
 it('mantém a sessão fechada quando as credenciais são rejeitadas',async()=>{
  const fixture=TestBed.createComponent(AppComponent);fixture.detectChanges();const app=fixture.componentInstance;
  app.username='admin';app.password='incorrecta';const pending=app.login();
  TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({message:'Credenciais inválidas.'},{status:401,statusText:'Unauthorized'});
  await pending;fixture.detectChanges();expect(app.db).toBeNull();expect(app.loginError).toBe('Credenciais inválidas.');expect(fixture.nativeElement.querySelector('#login').classList.contains('hidden')).toBeFalse();
 });
});
