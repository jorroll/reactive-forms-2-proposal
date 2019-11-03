import { NgModule } from '@angular/core';
import { NgFormControlNameDirective } from './form-control-name.directive';
import { NgFormGroupDirective } from './form-group.directive';
import { NgFormControlDirective } from './form-control.directive';
import { NgFormGroupNameDirective } from './form-group-name.directive';
import { AccessorsModule } from '../accessors';

@NgModule({
  imports: [AccessorsModule],
  providers: [],
  declarations: [
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
    NgFormGroupNameDirective,
  ],
  exports: [
    AccessorsModule,
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
    NgFormGroupNameDirective,
  ],
})
export class ReactiveFormsModule2 {}
