import { ControlEvent, ValidatorFn } from '../models';

export interface ControlStateMapper {
  fromControl: (state: ControlEvent<string, any>) => ControlEvent<string, any>;
  toControl: (state: ControlEvent<string, any>) => ControlEvent<string, any>;
}

export interface ControlValueMapper<ControlValue = any, NewValue = any> {
  fromControl: (value: ControlValue) => NewValue;
  toControl: (value: NewValue) => ControlValue;
  accessorValidator?: ValidatorFn;
}
