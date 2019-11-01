import { ControlEvent, ValidatorFn } from '../models';

export interface ControlValueMapper<ControlValue = any, AccessorValue = any> {
  toControl: (value: AccessorValue) => ControlValue;
  toAccessor: (value: ControlValue) => AccessorValue;
  accessorValidator?: ValidatorFn;
}

export interface ControlAccessorEvent extends ControlEvent {
  type: 'ControlAccessor';
  label: 'Cleanup' | 'PreInit' | 'PostInit';
}
