import { InjectionToken } from '@angular/core';
import { AbstractControl, ControlContainer } from '../models';

export interface ControlAccessor<T extends AbstractControl = AbstractControl> {
  readonly control: T;
}

export const NG_CONTROL_ACCESSOR = new InjectionToken<ControlAccessor>(
  'NG_CONTROL_ACCESSOR',
);

export interface ControlContainerAccessor<
  T extends ControlContainer = ControlContainer
> extends ControlAccessor<T> {}

export const NG_CONTROL_CONTAINER_ACCESSOR = new InjectionToken<
  ControlContainerAccessor
>('NG_CONTROL_CONTAINER_ACCESSOR');
