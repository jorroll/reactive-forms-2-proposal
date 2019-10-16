import { merge, concat } from 'rxjs';
import {
  AbstractControl,
  ControlEvent,
  ControlEventOptions,
} from './abstract-control';
import { filter, map } from 'rxjs/operators';
import { IControlBaseArgs } from './control-base';
import { ControlContainerBase } from './control-container-base';

export type IFormArrayArgs<V, D> = IControlBaseArgs<V, D>;

type FormArrayValue<T> = T extends readonly [...AbstractControl[]]
  ? {
      readonly [I in keyof T]: T[I] extends AbstractControl<infer R>
        ? R
        : never;
    }
  : never;

type ArrayValue<T> = T extends Array<infer R> ? R : any;

// Typescript currently cannot easily get indices of a tuple
// see https://github.com/microsoft/TypeScript/issues/32917
// This work-around taken from
// https://github.com/microsoft/TypeScript/issues/27995#issuecomment-441157546
// and https://stackoverflow.com/a/57510063/5490505
type ArrayKeys = keyof any[];
type StringIndices<T> = Exclude<keyof T, ArrayKeys>;
interface IndexMap {
  '0': 0;
  '1': 1;
  '2': 2;
  '3': 3;
  '4': 4;
  '5': 5;
  '6': 6;
  '7': 7;
  '8': 8;
  '9': 9;
  '10': 10;
  '11': 11;
  '12': 12;
}
type CastToNumber<T> = [T] extends [never]
  ? number
  : T extends keyof IndexMap
  ? IndexMap[T]
  : number;
type Indices<T> = CastToNumber<StringIndices<T>>;

// type Indices<T extends {length: number}> = Exclude<Partial<T>["length"], T['length']>;

export class FormArray<
  T extends ReadonlyArray<AbstractControl> = ReadonlyArray<AbstractControl>,
  D = any
> extends ControlContainerBase<T, FormArrayValue<T>, D> {
  protected _controls: T;

  constructor(
    controls: T = ([] as unknown) as T,
    options?: IFormArrayArgs<FormArrayValue<T>, D>,
  ) {
    super(extractValue<T>(controls), options);

    this._controls = (controls.slice() as unknown) as T;

    this.setupSource();
  }

  get<A extends Indices<T>>(a: A): T[A] | null;
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null;
  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null {
    return super.get(...args);
  }

  patchValue(
    value: Partial<FormArrayValue<T>>,
    options: ControlEventOptions = {},
  ) {
    if (!Array.isArray(value)) {
      throw new Error(
        'FormArray#partialValue() must be provided with an array value',
      );
    }

    (value as any).forEach((item: any, index: number) => {
      this.controls[index].patchValue(item, options);
    });
  }

  setControl<N extends Indices<T>>(
    index: N,
    control: T[N] | null,
    options: ControlEventOptions = {},
  ) {
    if (index > this.controls.length) {
      throw new Error(
        'Invalid FormArray#setControl index value. Provided index cannot be greater than FormArray#controls.length',
      );
    }

    if (control === null) {
      this.removeControl(index, options);
      return;
    }

    const value = this.controls.slice();

    value.splice(index, 1);

    this.source.next(this.buildEvent('controls', value, options));
  }

  addControl(
    control: ArrayValue<FormArrayValue<T>>,
    options: ControlEventOptions = {},
  ) {
    const value = [...this._controls, control];

    this.source.next(this.buildEvent('controls', value, options));
  }

  removeControl<N extends Indices<T>>(
    control: N | ArrayValue<FormArrayValue<T>>,
    options: ControlEventOptions = {},
  ) {
    let value: T;

    if (typeof control === 'object') {
      if (!this.controls.some(con => con === control)) return;

      value = this.controls.filter(con => con !== control) as any;
    } else {
      if (!this.controls[control]) return;

      value = this.controls.filter((_, index) => index !== control) as any;
    }

    this.source.next(this.buildEvent('controls', value, options));
  }

  markAllTouched(value: boolean, options: ControlEventOptions = {}) {
    this.controls.forEach(control => {
      control.markTouched(value, options);
    });
  }

  protected setupSource() {
    if (this._sourceSubscription) {
      this._sourceSubscription.unsubscribe();
    }

    this._sourceSubscription = merge(
      ...this.controls.map((control, index) =>
        concat(control.replayState(), control.events).pipe(
          filter(({ stateChange }) => !!stateChange),
          map<ControlEvent<string, any>, ControlEvent<string, unknown>>(
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
                  const newValue = this.value.slice();

                  newValue.splice(index, 1, value);

                  return {
                    ...shared,
                    value: newValue,
                    skipShapeValidation: true,
                    skipControls: true,
                  };
                }
                case 'disabled': {
                  return {
                    ...shared,
                    value: value && this.controls.every(ctrl => ctrl.disabled),
                  };
                }
                case 'touched': {
                  return {
                    ...shared,
                    value: value || this.controls.some(ctrl => ctrl.touched),
                  };
                }
                case 'changed': {
                  return {
                    ...shared,
                    value: value || this.controls.some(ctrl => ctrl.changed),
                  };
                }
                case 'pending': {
                  return {
                    ...shared,
                    value: value || this.controls.some(ctrl => ctrl.pending),
                  };
                }
                case 'submitted': {
                  return {
                    ...shared,
                    value: value && this.controls.every(ctrl => ctrl.submitted),
                  };
                }
                case 'readonly': {
                  return {
                    ...shared,
                    value: value && this.controls.every(ctrl => ctrl.readonly),
                  };
                }
                default: {
                  // We emit this noop state change so that
                  // `observe()` calls focused on nested children properties
                  // emit properly
                  return {
                    source: this.id,
                    applied,
                    type: 'childStateChange',
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

  protected validateValueShape(value: FormArrayValue<T>) {
    if (!Array.isArray(value)) {
      throw new Error('FormArray must recieve an array value');
    }

    const length = this.controls.length;
    const providedLength = value.length;

    if (length !== providedLength) {
      throw new Error(
        `FormArray "value" StateChange must have the same ` +
          `length as the FormArray's current value`,
      );
    }
  }

  protected processEvent(event: ControlEvent<string, any>) {
    switch (event.type) {
      case 'value': {
        event.stateChange = true;
        if (!event.skipShapeValidation) {
          this.validateValueShape(event.value);
        }

        if (!event.skipControls) {
          event.value.forEach((value: any, index: number) => {
            this.controls[index].setValue(value, event);
          });
        }

        // We extract the value from the controls in case the controls
        // themselves change the value
        this._value = extractValue<T>(this.controls || []);
        this.updateValidation(event);

        return true;
      }
      case 'controls': {
        event.stateChange = true;
        if (!Array.isArray(event.value)) {
          throw new Error(
            'FormArray#controls must be an array of AbstractControl',
          );
        }

        this._controls = (event.value.slice() as unknown) as T;

        this.setupSource();

        this.source.next(
          this.buildEvent('value', extractValue<T>(this.controls), event, {
            skipControls: true,
            skipShapeValidation: true,
          }),
        );

        return true;
      }
      case 'childStateChange': {
        event.stateChange = true;
        return true;
      }
    }

    return super.processEvent(event);
  }
}

function extractValue<T>(controls: readonly any[]) {
  return (controls.map((ctrl: any) => ctrl.value) as unknown) as FormArrayValue<
    T
  >;
}
