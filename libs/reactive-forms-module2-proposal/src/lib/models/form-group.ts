import { merge, concat } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import {
  AbstractControl,
  AbstractControlValue,
  StateChange,
  StateChangeOptions,
} from './abstract-control';
import { IControlBaseArgs } from './control-base';
import { ControlContainerBase } from './control-container-base';

export type IFormGroupArgs<V, D> = IControlBaseArgs<V, D>;

type FormGroupValue<T> = {
  readonly [P in keyof T]: AbstractControlValue<T[P]>;
};

export class FormGroup<
  T extends { readonly [key: string]: AbstractControl<any, any> } = {
    readonly [key: string]: AbstractControl<any, any>;
  },
  D = any
> extends ControlContainerBase<T, FormGroupValue<T>, D> {
  protected _controls: T;
  protected _controlsDefault: T;

  constructor(
    controls: T = {} as T,
    options?: IFormGroupArgs<FormGroupValue<T>, D>,
  ) {
    super(extractValue<T>(controls), options);

    this._controls = { ...controls };
    this._controlsDefault = { ...controls };

    this.setupSource();
  }

  get<A extends keyof T>(a: A): T[A] | null;
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null;
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null {
    return super.get(...args);
  }

  patchValue(
    value: Partial<FormGroupValue<T>>,
    options: StateChangeOptions = {},
  ) {
    Object.entries(value).forEach(([key, val]) => {
      this.controls[key].patchValue(val, options);
    });
  }

  setControl<N extends keyof T>(
    name: N,
    control: T[N] | null,
    options?: StateChangeOptions,
  ) {
    const value = {
      ...this._controls,
      [name]: control,
    };

    this.source.next(this.buildStateChange('controls', value, options));
  }

  addControl<N extends keyof T>(
    name: N,
    control: T[N],
    options?: StateChangeOptions,
  ) {
    if (this.controls[name]) return;

    const value = {
      ...this._controls,
      [name]: control,
    };

    this.source.next(this.buildStateChange('controls', value, options));
  }

  removeControl(name: keyof T, options?: StateChangeOptions) {
    if (!this.controls[name]) return;

    const value = Object.fromEntries(
      Object.entries(this._controls).filter(([key]) => key !== name),
    ) as T;

    this.source.next(this.buildStateChange('controls', value, options));
  }

  markAllTouched(value: boolean, options: StateChangeOptions = {}) {
    Object.values(this._controls).forEach(control => {
      control.markTouched(value, options);
    });
  }

  protected setupSource() {
    if (this._sourceSubscription) {
      this._sourceSubscription.unsubscribe();
    }

    this._sourceSubscription = merge(
      ...Object.entries(this.controls).map(([key, control]) =>
        concat(control.replayState(), control.changes).pipe(
          // filter(({ type }) =>
          //   [
          //     'value',
          //     'disabled',
          //     'readonly',
          //     'touched',
          //     'pending',
          //     'changed',
          //     'submitted',
          //   ].includes(type),
          // ),
          map<StateChange<string, any>, StateChange<string, unknown>>(
            ({ applied, type, value, noEmit, meta }) => {
              const shared = {
                source: this.id,
                applied,
                type,
                noEmit,
                meta,
              };

              switch (type) {
                case 'value': {
                  return {
                    ...shared,
                    value: {
                      ...this.value,
                      [key]: value,
                    },
                    skipShapeValidation: true,
                    skipControls: true,
                  } as StateChange<string, FormGroupValue<T>>;
                }
                case 'disabled': {
                  return {
                    ...shared,
                    value:
                      value &&
                      Object.values(this.controls).every(ctrl => ctrl.disabled),
                  };
                }
                case 'touched': {
                  return {
                    ...shared,
                    value:
                      value ||
                      Object.values(this.controls).some(ctrl => ctrl.touched),
                  };
                }
                case 'changed': {
                  return {
                    ...shared,
                    value:
                      value ||
                      Object.values(this.controls).some(ctrl => ctrl.changed),
                  };
                }
                case 'pending': {
                  return {
                    ...shared,
                    value:
                      value ||
                      Object.values(this.controls).some(ctrl => ctrl.pending),
                  };
                }
                case 'submitted': {
                  return {
                    ...shared,
                    value:
                      value &&
                      Object.values(this.controls).every(
                        ctrl => ctrl.submitted,
                      ),
                  };
                }
                case 'readonly': {
                  return {
                    ...shared,
                    value:
                      value &&
                      Object.values(this.controls).every(
                        ctrl => ctrl.submitted,
                      ),
                  };
                }
                default: {
                  // We emit this noop state change so that
                  // `observe()` calls focused on nested children properties
                  // emit properly
                  return {
                    source: this.id,
                    applied,
                    type: 'ChildStateChange',
                    value: undefined,
                  };
                }
              }
            },
          ),
        ),
      ),
    ).subscribe(this.source);
  }

  protected validateValueShape(value: FormGroupValue<T>) {
    const error = () => {
      console.error(
        'FormGroup incoming value, current controls',
        value,
        this.controls,
      );

      throw new Error(
        `FormGroup "value" StateChange must have the ` +
          `same shape as the FormGroup's controls`,
      );
    };

    if (value === null || value === undefined) error();

    const keys = Object.keys(this.controls || {});
    const providedKeys = Object.keys(value);

    if (
      keys.length !== providedKeys.length ||
      !keys.every(key => providedKeys.includes(key))
    ) {
      error();
    }
  }

  protected processState(state: StateChange<string, any>) {
    switch (state.type) {
      case 'value': {
        if (!state.skipShapeValidation) {
          this.validateValueShape(state.value);
        }

        if (!state.skipControls) {
          Object.entries(state.value).forEach(([key, value]) => {
            this.controls[key].source.next({
              ...state,
              value,
            });
          });
        }

        // We extract the value from the controls in case the controls
        // themselves change the value
        this._value = extractValue<T>((this.controls || {}) as T);
        this.updateValidation(state);

        return true;
      }
      case 'controls': {
        this._controls = { ...state.value };

        this.setupSource();

        this.source.next(
          this.buildStateChange(
            'value',
            extractValue<T>(this.controls),
            state,
            {
              skipControls: true,
              skipShapeValidation: true,
            },
          ),
        );

        return true;
      }
      case 'controlsDefault': {
        this._controlsDefault = { ...state.value };
        return true;
      }
    }

    return super.processState(state);
  }
}

function extractValue<T extends { [key: string]: any }>(
  obj: T,
): FormGroupValue<T>;
function extractValue<T extends { [key: string]: any }>(
  obj: Partial<T>,
): Partial<FormGroupValue<T>>;
function extractValue<T extends { [key: string]: any }>(obj: T) {
  return Object.fromEntries(
    Object.entries(obj).map(([key, control]) => [key, control.value]),
  );
}
