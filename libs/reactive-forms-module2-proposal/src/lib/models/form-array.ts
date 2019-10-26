import { merge, concat } from 'rxjs';
import {
  AbstractControl,
  ControlEvent,
  ControlEventOptions,
  AbstractControlValue,
  ProcessedControlEvent,
} from './abstract-control';
import { filter, map, tap } from 'rxjs/operators';
import { IControlBaseArgs } from './control-base';
import { ControlContainerBase } from './control-container-base';
import { ControlContainer } from './control-container';

export type IFormArrayArgs<D> = IControlBaseArgs<D>;

export type FormArrayValue<
  T extends readonly AbstractControl[]
> = T[number]['value'][];

export type FormArrayEnabledValue<
  T extends readonly AbstractControl[]
> = T[number] extends ControlContainer
  ? T[number]['enabledValue'][]
  : T[number]['value'][];

type ArrayElement<T> = T extends Array<infer R> ? R : any;

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
  T extends ReadonlyArray<AbstractControl> = Array<AbstractControl>,
  D = any
> extends ControlContainerBase<
  T,
  FormArrayValue<T>,
  FormArrayEnabledValue<T>,
  D
> {
  protected _controls: T;

  constructor(controls: T = ([] as unknown) as T, options?: IFormArrayArgs<D>) {
    super(extractValue(controls), options);

    this._controls = (controls.slice() as unknown) as T;
    this._normalizedControls = this._controls.map((c, i) => [i, c]);
    this._enabledValue = extractEnabledValue(controls);

    this.setupSource();
  }

  get<A extends Indices<T>>(a: A): T[A];
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
      this._controls[index].patchValue(item, options);
    });
  }

  setControl<N extends Indices<T>>(
    index: N,
    control: T[N] | null,
    options: ControlEventOptions = {},
  ) {
    if (index > this._controls.length) {
      throw new Error(
        'Invalid FormArray#setControl index value. Provided index cannot be greater than FormArray#controls.length',
      );
    }

    if (control === null) {
      this.removeControl(index, options);
      return;
    }

    const value = this._controls.slice();

    value.splice(index, 1);

    this.source.next(this.buildEvent('controls', value, options));
  }

  addControl(
    control: ArrayElement<FormArrayValue<T>>,
    options: ControlEventOptions = {},
  ) {
    const value = [...this._controls, control];

    this.source.next(this.buildEvent('controls', value, options));
  }

  removeControl<N extends Indices<T>>(
    control: N | ArrayElement<FormArrayValue<T>>,
    options: ControlEventOptions = {},
  ) {
    let value: T;

    if (typeof control === 'object') {
      if (!this._controls.some(con => con === control)) return;

      value = this._controls.filter(con => con !== control) as any;
    } else {
      if (!this._controls[control]) return;

      value = this._controls.filter((_, index) => index !== control) as any;
    }

    this.source.next(this.buildEvent('controls', value, options));
  }

  protected validateValueShape(value: FormArrayValue<T>, eventId: number) {
    const error = () => {
      console.error(
        `FormArray ControlEvent #${eventId}`,
        `incoming value:`,
        value,
        'current controls:',
        this._controls,
        this,
      );

      throw new Error(
        `FormArray "value" ControlEvent #${eventId} must have the ` +
          `same shape as the FormArray's controls`,
      );
    };

    if (Array.isArray(value)) error();

    const length = this._controls.length;
    const providedLength = value.length;

    if (length !== providedLength) {
      error();
    }
  }

  protected processValue() {
    return extractValue<T>(this._controls || []);
  }

  protected processEnabledValue() {
    return extractEnabledValue<T>((this._controls || []) as T);
  }

  protected processEvent(event: ProcessedControlEvent<string, any>) {
    switch (event.type) {
      case 'value': {
        event.stateChange = true;

        this.validateValueShape(event.value, event.id);
        event.value.forEach((value: any, index: number) => {
          this._controls[index].source.next({
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
        if (!Array.isArray(event.value)) {
          throw new Error(
            'FormArray#controls must be an array of AbstractControl',
          );
        }

        event.stateChange = true;
        this._controls = (event.value.slice() as unknown) as T;
        this._normalizedControls = this._controls.map((c, i) => [i, c]);
        this._size = this._controls.length;
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

function extractEnabledValue<T extends ReadonlyArray<AbstractControl>>(
  controls: T,
) {
  return (controls
    .filter(ctrl => ctrl.enabled)
    .map(ctrl =>
      ControlContainer.isControlContainer(ctrl)
        ? ctrl.enabledValue
        : ctrl.value,
    ) as any) as FormArrayEnabledValue<T>;
}

function extractValue<T extends ReadonlyArray<AbstractControl>>(controls: T) {
  return (controls.map(ctrl => ctrl.value) as any) as FormArrayValue<T>;
}
