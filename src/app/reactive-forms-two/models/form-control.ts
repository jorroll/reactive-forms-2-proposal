import { AbstractControl, IAbstractControlArgs } from './abstract-control';

export type FormControlValue<T> = T extends FormControl<infer V, any> ? V : any;
export type FormControlData<T> = T extends FormControl<any, infer D> ? D : any;

export class FormControl<Value = any, Data = any> extends AbstractControl<
  Value,
  Data
> {
  constructor(args: IAbstractControlArgs<Value, Data> = {}) {
    super(Symbol(`FormControl ${FormControl.id}`), args);
  }
}
