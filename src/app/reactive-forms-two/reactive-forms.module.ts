import { NgModule } from '@angular/core';
import { AccessorsModule } from './accessors';
import {
  FormControlDirective,
  NgCompatFormControlDirective,
} from './directives';

@NgModule({
  imports: [AccessorsModule],
  providers: [],
  declarations: [FormControlDirective, NgCompatFormControlDirective],
  exports: [
    AccessorsModule,
    FormControlDirective,
    NgCompatFormControlDirective,
  ],
})
export class ReactiveForms2Module {}
