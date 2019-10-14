import { StateChange, ValidatorFn } from '../models';

export interface ControlStateMapper {
  fromControl: (state: StateChange<string, any>) => StateChange<string, any>;
  toControl: (state: StateChange<string, any>) => StateChange<string, any>;
}

export interface ControlValueMapper<ControlValue = any, NewValue = any> {
  fromControl: (value: ControlValue) => NewValue;
  toControl: (value: NewValue) => ControlValue;
  accessorValidator?: ValidatorFn;
}
