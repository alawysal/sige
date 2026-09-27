import { Component, NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
@Component({template:''})
export class RouteAnchorComponent {}
const routes: Routes=[{path:'',redirectTo:'sige',pathMatch:'full'},{path:'sige',component:RouteAnchorComponent},{path:'sige/app/:view',component:RouteAnchorComponent},{path:'**',redirectTo:'sige'}];
@NgModule({declarations:[RouteAnchorComponent],imports:[RouterModule.forRoot(routes)],exports:[RouterModule]})
export class AppRoutingModule {}
