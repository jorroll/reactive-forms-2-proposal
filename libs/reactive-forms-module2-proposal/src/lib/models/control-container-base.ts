import { Subscription, concat, from } from 'rxjs';
import { FormControl as _FormControl } from '@angular/forms';
import { map } from 'rxjs/operators';
import {
  AbstractControl,
  ControlEvent,
  ControlEventOptions,
} from './abstract-control';
import { ControlContainer } from './control-container';
import { ControlBase, IControlBaseArgs } from './control-base';

export abstract class ControlContainerBase<C, V, D> extends ControlBase<V, D>
  implements ControlContainer<C, V, D> {
  protected abstract _controls: C;
  get controls() {
    return this._controls;
  }

  protected abstract _controlsDefault: C;

  protected _sourceSubscription?: Subscription;

  constructor(value: V, options: IControlBaseArgs<V, D> = {}) {
    super(value, options);
  }

  [ControlContainer.CONTROL_CONTAINER_INTERFACE]() {
    return this;
  }

  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null {
    if (args.length === 0) return null;
    else if (args.length === 1) return (this.controls as any)[args[0]];

    return args.reduce(
      (prev: AbstractControl | null, curr) => {
        if (prev instanceof ControlContainer) {
          return prev.get(curr);
        }

        return null;
      },
      this as AbstractControl | null,
    );
  }

  setValue(value: V, options: ControlEventOptions = {}) {
    this.validateValueShape(value);

    super.setValue(value, options);
  }

  abstract setControl(...args: any[]): void;

  abstract addControl(...args: any[]): void;

  abstract removeControl(...args: any[]): void;

  abstract markAllTouched(value: boolean, options?: ControlEventOptions): void;

  replayState(
    options: ControlEventOptions & { includeDefaults?: boolean } = {},
  ) {
    const state: ControlEvent<string, any>[] = [
      this.buildEvent('controls', this.controls, options),
    ];

    if (options.includeDefaults) {
      state.push(
        this.buildEvent(
          'controlsDefault',
          this._controlsDefault,
          options,
        ),
      );
    }

    return concat(
      from(state).pipe(
        map(state => {
          // we reset the applied array so that this saved
          // state change can be applied to the same control
          // multiple times
          (state as any).applied = [];
          return state;
        }),
      ),
      super.replayState(options),
    );
  }

  protected abstract validateValueShape(value: V): void;
}
