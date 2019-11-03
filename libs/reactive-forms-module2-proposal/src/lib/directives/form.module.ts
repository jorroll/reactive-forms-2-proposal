import { NgModule } from '@angular/core';
import { NgFormControlNameDirective } from './form-control-name.directive';
import { NgFormGroupDirective } from './form-group.directive';
import { NgFormControlDirective } from './form-control.directive';
import { NgFormGroupNameDirective } from './form-group-name.directive';

@NgModule({
  imports: [],
  providers: [],
  declarations: [
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
    NgFormGroupNameDirective,
  ],
  exports: [
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
    NgFormGroupNameDirective,
  ],
})
export class ReactiveFormsModule2 {}
