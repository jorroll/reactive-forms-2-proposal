import { merge, concat } from 'rxjs';
import { map, filter, tap } from 'rxjs/operators';
import {
  AbstractControl,
  ControlEvent,
  ControlEventOptions,
  ProcessedControlEvent,
} from './abstract-control';
import { IControlBaseArgs } from './control-base';
import { ControlContainerBase } from './control-container-base';
import { ControlContainer } from './control-container';

export type IFormGroupArgs<D> = IControlBaseArgs<D>;

export type FormGroupValue<T extends { [key: string]: AbstractControl }> = {
  [P in keyof T]: T[P]['value'];
};

export type FormGroupEnabledValue<
  T extends { [key: string]: AbstractControl }
> = Partial<
  {
    [P in keyof T]: T[P] extends ControlContainer
      ? T[P]['enabledValue']
      : T[P]['value'];
  }
>;

export class FormGroup<
  T extends { readonly [key: string]: AbstractControl<any, any> } = {
    [key: string]: AbstractControl<any, any>;
  },
  D = any
> extends ControlContainerBase<
  T,
  FormGroupValue<T>,
  FormGroupEnabledValue<T>,
  D
> {
  protected _controls: T;

  constructor(controls: T = {} as T, options?: IFormGroupArgs<D>) {
    super(extractValue<T>(controls), options);

    this._controls = { ...controls };
    this._normalizedControls = Object.entries(this._controls);
    this._enabledValue = extractEnabledValue(controls);

    this.setupSource();
  }

  get<A extends keyof T>(a: A): T[A];
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null;
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null {
    return super.get(...args);
  }

  patchValue(
    value: Partial<FormGroupValue<T>>,
    options: ControlEventOptions = {},
  ) {
    Object.entries(value).forEach(([key, val]) => {
      this._controls[key].patchValue(val, options);
    });
  }

  setControl<N extends keyof T>(
    name: N,
    control: T[N] | null,
    options?: ControlEventOptions,
  ) {
    const value = {
      ...this._controls,
      [name]: control,
    };

    this.source.next(this.buildEvent('controls', value, options));
  }

  addControl<N extends keyof T>(
    name: N,
    control: T[N],
    options?: ControlEventOptions,
  ) {
    if (this._controls[name]) return;

    const value = {
      ...this._controls,
      [name]: control,
    };

    this.source.next(this.buildEvent('controls', value, options));
  }

  removeControl(name: keyof T, options?: ControlEventOptions) {
    if (!this._controls[name]) return;

    const value = Object.fromEntries(
      Object.entries(this._controls).filter(([key]) => key !== name),
    ) as T;

    this.source.next(this.buildEvent('controls', value, options));
  }

  protected validateValueShape(value: FormGroupValue<T>, eventId: number) {
    const error = () => {
      console.error(
        `FormGroup ControlEvent #${eventId}`,
        `incoming value:`,
        value,
        'current controls:',
        this._controls,
        this,
      );

      throw new Error(
        `FormGroup "value" ControlEvent #${eventId} must have the ` +
          `same shape as the FormGroup's controls`,
      );
    };

    if (value === null || value === undefined) error();

    const keys = Object.keys(this._controls || {});
    const providedKeys = Object.keys(value);

    if (
      keys.length !== providedKeys.length ||
      !keys.every(key => providedKeys.includes(key))
    ) {
      error();
    }
  }

  protected processValue() {
    return extractValue<T>((this._controls || {}) as T);
  }

  protected processEnabledValue() {
    return extractEnabledValue<T>((this._controls || {}) as T);
  }

  protected processEvent(event: ProcessedControlEvent<string, any>) {
    switch (event.type) {
      case 'value': {
        event.stateChange = true;

        this.validateValueShape(event.value, event.id);

        Object.entries(event.value).forEach(([key, value]) => {
          // `...event` includes the `applied` array (so these
          // events won't trigger new updates to this FormGroup).
          this._controls[key].source.next({
            ...event,
            value,
          });
        });

        // We extract the value from the controls in case the controls
        // themselves change the value
        this._value = this.processValue();
        this._enabledValue = this.processEnabledValue();
        this.updateValidation(event);

        return true;
      }
      case 'controls': {
        event.stateChange = true;
        this._controls = { ...event.value };
        this._normalizedControls = Object.entries(this._controls);
        this._size = Object.values(this._controls).length;
        this.setupSource();
        return true;
      }
      case 'childEvent': {
        return this.processChildEvent(event);
      }
    }

    return super.processEvent(event);
  }

  protected processChildEvent(
    parentEvent: ProcessedControlEvent<string, any>,
  ): boolean {
    const event = parentEvent.value;

    switch (event.type) {
      case 'value': {
        parentEvent.stateChange = true;
        this._value = this.processValue();
        this._enabledValue = this.processEnabledValue();
        this.updateValidation(event);
        return true;
      }
    }

    return super.processChildEvent(parentEvent);
  }
}

function extractEnabledValue<T extends { [key: string]: AbstractControl }>(
  obj: T,
) {
  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, ctrl]) => ctrl.enabled)
      .map(([key, ctrl]) => [
        key,
        ControlContainer.isControlContainer(ctrl)
          ? ctrl.enabledValue
          : ctrl.value,
      ]),
  ) as FormGroupEnabledValue<T>;
}

function extractValue<T extends { [key: string]: AbstractControl }>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, ctrl]) => [key, ctrl.value]),
  ) as FormGroupValue<T>;
}
