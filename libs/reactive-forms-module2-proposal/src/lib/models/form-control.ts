import { ControlBase, IControlBaseArgs } from './control-base';

export type IFormControlArgs<V, D> = IControlBaseArgs<V, D>;

export class FormControl<V = any, D = any> extends ControlBase<V, D> {
  constructor(value?: V, options: IFormControlArgs<V, D> = {}) {
    super(value, options);
  }

  get(..._args: any[]): null {
    return null;
  }
}
