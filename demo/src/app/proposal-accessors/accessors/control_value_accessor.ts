import { InjectionToken, Type } from '@angular/core';
import { ControlAccessor } from 'reactive-forms-module2-proposal';

export const SW_DEFAULT_CONTROL_ACCESSOR_TOKEN = new InjectionToken<
  Type<ControlAccessor>
>('SW_DEFAULT_CONTROL_ACCESSOR_TOKEN');

export const SW_CONTROL_ACCESSOR_TOKEN = new InjectionToken<
  [string, Type<ControlAccessor>]
>('SW_CONTROL_ACCESSOR_TOKEN');
