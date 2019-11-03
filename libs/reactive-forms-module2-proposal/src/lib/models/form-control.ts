import { ControlBase, IControlBaseArgs } from './control-base';

export type IFormControlArgs<D> = IControlBaseArgs<D>;

export class FormControl<V = any, D = any> extends ControlBase<V, D> {
  static id = 0;

  id = Symbol(`FormControl-${FormControl.id++}`);

  constructor(value?: V, options: IFormControlArgs<D> = {}) {
    super(value, options);
  }
}
