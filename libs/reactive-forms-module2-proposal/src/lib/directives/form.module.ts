import { NgModule } from '@angular/core';
import { NgFormControlNameDirective } from './form-control-name.directive';
import { NgFormGroupDirective } from './form-group.directive';
import { NgFormControlDirective } from './form-control.directive';
import { NgFormGroupNameDirective } from './form-group-name.directive';
import { AccessorsModule } from '../accessors';
import { NgFormArrayDirective } from './form-array.directive';
import { NgFormArrayNameDirective } from './form-array-name.directive';

@NgModule({
  imports: [AccessorsModule],
  providers: [],
  declarations: [
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
    NgFormGroupNameDirective,
    NgFormArrayDirective,
    NgFormArrayNameDirective,
  ],
  exports: [
    AccessorsModule,
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
    NgFormGroupNameDirective,
    NgFormArrayDirective,
    NgFormArrayNameDirective,
  ],
})
export class ReactiveFormsModule2 {}
