import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ApiService } from './api.service';

describe('Fluxo de exportação autenticada',()=>{
 let api: ApiService;let http: HttpTestingController;
 beforeEach(()=>{
  sessionStorage.setItem('sige_token','token-de-teste');
  TestBed.configureTestingModule({imports:[HttpClientTestingModule]});
  api=TestBed.inject(ApiService);http=TestBed.inject(HttpTestingController);
 });
 afterEach(()=>{http.verify();sessionStorage.removeItem('sige_token');});
 it('encerra a sessão também quando o download CSV recebe 401',async()=>{
  const download=api.exportRenewals('2027/2028');
  const request=http.expectOne('/api/exports/renewals?year=2027/2028');
  expect(request.request.headers.get('Authorization')).toBe('Bearer token-de-teste');
  const failed=expectAsync(download).toBeRejected();
  request.flush('{"message":"Sessão inválida ou expirada."}',{status:401,statusText:'Unauthorized'});
  await failed;
  expect(api.hasSession).toBeFalse();expect(api.expired.value).toBeTrue();expect(sessionStorage.getItem('sige_token')).toBeNull();
 });
 it('apresenta o erro JSON devolvido por um endpoint de texto',async()=>{
  const download=api.exportRenewals('inexistente').catch(error=>api.error(error));
  http.expectOne('/api/exports/renewals?year=inexistente').flush('{"message":"Ano lectivo inexistente."}',{status:422,statusText:'Unprocessable Entity'});
  expect(await download).toBe('Ano lectivo inexistente.');expect(api.hasSession).toBeTrue();
 });
});
