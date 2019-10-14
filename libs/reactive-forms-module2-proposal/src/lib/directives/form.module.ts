import { NgModule } from '@angular/core';
import { NgFormControlNameDirective } from './form-control-name.directive';
import { NgFormGroupDirective } from './form-group.directive';
import { NgFormControlDirective } from './form-control.directive';
import { AccessorsModule } from '../accessors';

@NgModule({
  imports: [AccessorsModule],
  providers: [],
  declarations: [
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
  ],
  exports: [
    AccessorsModule,
    NgFormControlDirective,
    NgFormControlNameDirective,
    NgFormGroupDirective,
  ],
})
export class ReactiveFormsModule2Proposal {}
