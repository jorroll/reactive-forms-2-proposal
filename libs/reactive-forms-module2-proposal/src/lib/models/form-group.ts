import { merge, concat } from 'rxjs';
import { map, filter, tap } from 'rxjs/operators';
import { AbstractControl, ControlEventOptions } from './abstract-control';
import { IControlBaseArgs, StateChange } from './control-base';
import { ControlContainerBase } from './control-container-base';
import { ControlContainer } from './control-container';
import { isMapEqual, pluckOptions } from './util';

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
  static id = 0;

  protected _controlsStore: ReadonlyMap<keyof T, T[keyof T]> = new Map();
  get controlsStore() {
    return this._controlsStore;
  }

  protected _controls: T;

  constructor(controls: T = {} as T, options: IFormGroupArgs<D> = {}) {
    super(
      options.id || Symbol(`FormGroup-${FormGroup.id++}`),
      extractValue<T>(controls),
      options,
    );

    this._controls = { ...controls };
    this._controlsStore = new Map<keyof T, T[keyof T]>(Object.entries(
      this._controls,
    ) as any);
    this._enabledValue = extractEnabledValue(controls);

    this.setupControls(new Map());
    this.registerControls();
  }

  get<A extends keyof T>(a: A): T[A];
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null;
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null {
    return super.get(...args);
  }

  equalValue(
    value: FormGroupValue<T>,
    options: { assertShape?: boolean } = {},
  ): value is FormGroupValue<T> {
    const error = () => {
      console.error(
        `FormGroup`,
        `incoming value:`,
        value,
        'current controls:',
        this.controls,
      );

      throw new Error(
        `FormGroup "value" must have the ` +
          `same shape (keys) as the FormGroup's controls`,
      );
    };

    if (this.controlsStore.size !== Object.keys(value).length) {
      if (options.assertShape) error();
      return false;
    }

    return Array.from(this.controlsStore).every(([key, control]) => {
      if (!value.hasOwnProperty(key)) {
        if (options.assertShape) error();
        return false;
      }

      return ControlContainer.isControlContainer(control)
        ? control.equalValue(value[key], options)
        : control.equalValue(value[key]);
    });
  }

  setValue(value: FormGroupValue<T>, options: ControlEventOptions = {}) {
    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['value', value]]),
      ...pluckOptions(options),
    });
  }

  patchValue(
    value: Partial<FormGroupValue<T>>,
    options: ControlEventOptions = {},
  ) {
    Object.entries(value).forEach(([key, val]) => {
      const c = this.controls[key];

      if (!c) {
        throw new Error(`FormGroup: Invalid patchValue key "${key}".`);
      }

      c.patchValue(val, options);
    });
  }

  setControls(controls: T, options?: ControlEventOptions) {
    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([
        ['controlsStore', new Map(Object.entries(controls))],
      ]),
      ...pluckOptions(options),
    });
  }

  setControl<N extends keyof T>(
    name: N,
    control: T[N] | null,
    options?: ControlEventOptions,
  ) {
    const controls = new Map(this.controlsStore);

    if (control) {
      controls.set(name, control);
    } else {
      controls.delete(name);
    }

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['controlsStore', controls]]),
      ...pluckOptions(options),
    });
  }

  addControl<N extends keyof T>(
    name: N,
    control: T[N],
    options?: ControlEventOptions,
  ) {
    if (this.controlsStore.has(name)) return;

    this.setControl(name, control, options);
  }

  removeControl(name: keyof T, options?: ControlEventOptions) {
    if (!this.controlsStore.has(name)) return;

    this.setControl(name, null, options);
  }

  protected setupControls(
    changes: Map<string, any>,
    options?: ControlEventOptions,
  ) {
    super.setupControls(changes);

    const newValue = { ...this._value };
    const newEnabledValue = { ...this._enabledValue };

    this.controlsStore.forEach((control, key) => {
      newValue[key as keyof FormGroupValue<T>] = control.value;

      if (control.enabled) {
        newEnabledValue[
          key as keyof FormGroupValue<T>
        ] = ControlContainer.isControlContainer(control)
          ? control.enabledValue
          : control.value;
      }
    });

    this._value = newValue;
    this._enabledValue = newEnabledValue;

    // updateValidation must come before "value" change
    // is set
    this.updateValidation(changes, options);
    changes.set('value', newValue);
  }

  protected processStateChange(args: {
    event: StateChange;
    value: any;
    prop: string;
    changes: Map<string, any>;
  }): boolean {
    const { value, prop, changes, event } = args;

    switch (prop) {
      case 'value': {
        if (this.equalValue(value, { assertShape: true })) {
          return true;
        }

        this.controlsStore.forEach((control, key) => {
          control.patchValue(value[key], event);
        });

        const newValue = { ...this._value };
        const newEnabledValue = { ...this._enabledValue };

        Object.keys(value).forEach(k => {
          const c = this.controlsStore.get(k)!;
          newValue[k as keyof FormGroupValue<T>] = c.value;
          newEnabledValue[
            k as keyof FormGroupValue<T>
          ] = ControlContainer.isControlContainer(c) ? c.enabledValue : c.value;
        });

        this._value = newValue;
        this._enabledValue = newEnabledValue;

        // As with the ControlBase "value" change, I think "updateValidation"
        // needs to come before the "value" change is set. See the ControlBase
        // "value" StateChange for more info.
        this.updateValidation(changes, event);
        changes.set('value', newValue);
        return true;
      }
      case 'controlsStore': {
        if (isMapEqual(this.controlsStore, value)) return true;

        this.deregisterControls();
        this._controlsStore = new Map(value);
        this._controls = Object.fromEntries(value) as T;
        changes.set('controlsStore', new Map(value));
        this.setupControls(changes, event); // <- will setup value
        this.registerControls();
        return true;
      }
      default: {
        return super.processStateChange(args);
      }
    }
  }

  protected processChildStateChange(args: {
    control: AbstractControl;
    key: keyof FormGroupValue<T>;
    event: StateChange;
    prop: string;
    value: any;
    changes: Map<string, any>;
  }): boolean {
    const { control, key, prop, value, event, changes } = args;

    switch (prop) {
      case 'value': {
        const newValue = { ...this._value };
        const newEnabledValue = { ...this._enabledValue };

        newValue[key] = control.value;
        newEnabledValue[key] = ControlContainer.isControlContainer(control)
          ? control.enabledValue
          : control.value;

        this._value = newValue;
        this._enabledValue = newEnabledValue;

        // As with the "value" change, I think "updateValidation"
        // needs to come before the "value" change is set
        this.updateValidation(changes, event);
        changes.set('value', newValue);
        return true;
      }
      case 'disabled': {
        super.processChildStateChange(args);

        const newEnabledValue = { ...this._enabledValue };

        if (control.enabled) {
          newEnabledValue[key] = ControlContainer.isControlContainer(control)
            ? control.enabledValue
            : control.value;
        } else {
          delete newEnabledValue[key];
        }

        this._enabledValue = newEnabledValue;

        return true;
      }
    }

    return super.processChildStateChange(args);
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
