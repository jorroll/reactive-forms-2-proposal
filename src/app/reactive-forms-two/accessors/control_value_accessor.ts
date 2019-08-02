import { InjectionToken, Type } from '@angular/core';
import { AbstractControl } from '../models';

export const SW_DEFAULT_VALUE_ACCESSOR = new InjectionToken<
  Type<ControlValueAccessor>
>('SW_DEFAULT_VALUE_ACCESSOR');

export const SW_VALUE_ACCESSOR = new InjectionToken<
  [string, Type<ControlValueAccessor>]
>('SW_VALUE_ACCESSOR');

export interface ControlValueAccessor<T = any> {
  control: AbstractControl<T>;
}
