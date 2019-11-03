import { NgModule } from '@angular/core';
import { NgCompatFormControlDirective } from './ng_compat_form_control_directive';
import { NgCompatFormControlNameDirective } from './ng_compat_form_control_name_directive';

@NgModule({
  imports: [],
  providers: [],
  declarations: [
    NgCompatFormControlDirective,
    NgCompatFormControlNameDirective,
  ],
  exports: [NgCompatFormControlDirective, NgCompatFormControlNameDirective],
})
export class ReactiveFormsModule2Compat {}
