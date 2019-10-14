import { NgModule } from '@angular/core';
import { AccessorsService } from './accessors.service';
import { DEFAULT_VALUE_ACCESSOR_PROVIDER } from './default_value_accessor';

@NgModule({
  declarations: [],
  exports: [],
  providers: [AccessorsService, DEFAULT_VALUE_ACCESSOR_PROVIDER],
})
export class AccessorsModule {}
