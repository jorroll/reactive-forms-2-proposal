import { Observable, Subject } from 'rxjs';

export interface ValidationErrors {
  [key: string]: any;
}

export type ValidatorFn = (
  control: AbstractControl<any, any>,
) => ValidationErrors | null;

export type AbstractControlValue<T> = T extends AbstractControl<infer V>
  ? V
  : any;
export type AbstractControlData<T> = T extends AbstractControl<any, infer D>
  ? D
  : any;

export type ControlId = string | symbol;

export interface ControlEvent<Type extends string, Value> {
  source: ControlId;
  readonly applied: ControlId[];
  type: Type;
  value: Value;
  noEmit?: boolean;
  meta?: { [key: string]: any };
  [key: string]: any;
}

export interface ProcessedControlEvent<Type extends string, Value> extends ControlEvent<Type, Value> {
  id: number;
  meta: { [key: string]: any };
  stateChange?: boolean;
}

export interface ControlEventOptions {
  noEmit?: boolean;
  meta?: { [key: string]: any };
  source?: ControlId;
}

export type DeepReadonly<T> =
  T extends Array<infer R> ? DeepReadonlyArray<R> :
  T extends Function ? T :
  T extends object ? DeepReadonlyObject<T> :
  T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

// export type DeepOptional<T> =
//   T extends Array<any> ? T :
//   T extends Function ? T :
//   T extends object ? DeepOptionalObject<T> :
//   T;

// type DeepOptionalObject<T> = {
//   [P in keyof T]-?: DeepOptional<T[P]>;
// };

/**
 * ControlSource is a special rxjs Subject which never
 * completes.
 */
export class ControlSource<T> extends Subject<T> {
  /** NOOP: Complete does nothing */
  complete() {}
}

export namespace AbstractControl {
  export let id = 0;
  export let eventId = 0;
  export const ABSTRACT_CONTROL_INTERFACE = Symbol('@@AbstractControlInterface');
  export function isAbstractControl(object?: any): object is AbstractControl {
    return (
      typeof object === 'object' &&
      typeof object[AbstractControl.ABSTRACT_CONTROL_INTERFACE] === 'function' &&
      object[AbstractControl.ABSTRACT_CONTROL_INTERFACE]() === object
    );
  }
}

export interface AbstractControl<Value = any, Data = any> {

  /**
   * The ID is used to determine where StateChanges originated,
   * and to ensure that a given AbstractControl only processes
   * values one time.
   */
  id: ControlId;

  data: Data;

  /**
   * **Warning!** Do not use this property unless you know what you are doing.
   *
   * A control's `source` is the source of truth for the control. Events emitted
   * by the source are used to update the control's values. By passing events to
   * this control's source, you can programmatically control every aspect of
   * of this control.
   *
   * Never subscribe to the source directly. If you want to receive events for
   * this control, subscribe to the `events` observable.
   */
  source: ControlSource<ControlEvent<string, any>>;

  /** An observable of all events for this AbstractControl */
  events: Observable<ProcessedControlEvent<string, any>>;

  value: DeepReadonly<Value>;

  errors: ValidationErrors | null;

  /**
   * A map of validation errors keyed to the source which added them.
   */
  errorsStore: ReadonlyMap<ControlId, ValidationErrors>;

  disabled: boolean;
  enabled: boolean;
  valid: boolean;
  invalid: boolean;
  pending: boolean;

  /**
   * A map of pending states keyed to the source which added them.
   * So long as there are any `true` boolean values, this control's
   * `pending` property will be `true`.
   */
  pendingStore: ReadonlyMap<ControlId, true>;

  status: 'DISABLED' | 'PENDING' | 'VALID' | 'INVALID';

  /**
   * focusChanges allows consumers to be notified when this
   * form control should be focused or blurred.
   */
  focusChanges: Observable<boolean>;

  readonly: boolean;
  submitted: boolean;
  touched: boolean;
  changed: boolean;
  dirty: boolean;

  /**
   * A map of ValidatorFn keyed to the source which added them.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  validatorStore: ReadonlyMap<ControlId, ValidatorFn>;

  validator: ValidatorFn | null;

  [AbstractControl.ABSTRACT_CONTROL_INTERFACE](): this;

  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G],
    I extends keyof this[A][B][C][D][E][F][G][H],
    J extends keyof this[A][B][C][D][E][F][G][H][I],
    K extends keyof this[A][B][C][D][E][F][G][H][I][J]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    i: I,
    j: J,
    k: K,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H][I][J][K] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G],
    I extends keyof this[A][B][C][D][E][F][G][H],
    J extends keyof this[A][B][C][D][E][F][G][H][I]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    i: I,
    j: J,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H][I][J] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G],
    I extends keyof this[A][B][C][D][E][F][G][H]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    i: I,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H][I] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D] | undefined>;
  observeChanges<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B]
  >(
    a: A,
    b: B,
    c: C,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C] | undefined>;
  observeChanges<A extends keyof this, B extends keyof this[A]>(
    a: A,
    b: B,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B] | undefined>;
  observeChanges<A extends keyof this>(
    a: A,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A]>;
  observeChanges<T = any>(
    props: string[],
    options?: { ignoreNoEmit?: boolean },
  ): Observable<T>;

  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G],
    I extends keyof this[A][B][C][D][E][F][G][H],
    J extends keyof this[A][B][C][D][E][F][G][H][I],
    K extends keyof this[A][B][C][D][E][F][G][H][I][J]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    i: I,
    j: J,
    k: K,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H][I][J][K] | undefined>;
  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G],
    I extends keyof this[A][B][C][D][E][F][G][H],
    J extends keyof this[A][B][C][D][E][F][G][H][I]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    i: I,
    j: J,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H][I][J] | undefined>;
  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G],
    I extends keyof this[A][B][C][D][E][F][G][H]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    i: I,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H][I] | undefined>;
  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F],
    H extends keyof this[A][B][C][D][E][F][G]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    h: H,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G][H] | undefined>;
  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E],
    G extends keyof this[A][B][C][D][E][F]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    g: G,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F][G] | undefined>;
  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D],
    F extends keyof this[A][B][C][D][E]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    f: F,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E][F] | undefined>;
  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C],
    E extends keyof this[A][B][C][D]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    e: E,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D][E] | undefined>;

  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B],
    D extends keyof this[A][B][C]
  >(
    a: A,
    b: B,
    c: C,
    d: D,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C][D] | undefined>;
  observe<
    A extends keyof this,
    B extends keyof this[A],
    C extends keyof this[A][B]
  >(
    a: A,
    b: B,
    c: C,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B][C] | undefined>;
  observe<A extends keyof this, B extends keyof this[A]>(
    a: A,
    b: B,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A][B] | undefined>;
  observe<A extends keyof this>(
    a: A,
    options?: { ignoreNoEmit?: boolean },
  ): Observable<this[A]>;
  observe<T = any>(
    props: string[],
    options?: { ignoreNoEmit?: boolean },
  ): Observable<T>;

  setValue(value: Value, options?: ControlEventOptions): void;

  patchValue(value: any, options?: ControlEventOptions): void;

  /**
   * If provided a `ValidationErrors` object or `null`, replaces the errors
   * associated with the source ID.
   *
   * If provided a `Map` object containing `ValidationErrors` keyed to source IDs,
   * uses it to replace the `errorsStore` associated with this control.
   */
  setErrors(
    value: ValidationErrors | null | ReadonlyMap<ControlId, ValidationErrors>,
    options?: ControlEventOptions,
  ): void;

  /**
   * If provided a `ValidationErrors` object, that object is merged with the
   * existing errors associated with the source ID. If the error object has
   * properties containing `null`, errors associated with those keys are deleted
   * from the `errorsStore`.
   *
   * If provided a `Map` object containing `ValidationErrors` keyed to source IDs,
   * that object is merged with the existing `errorsStore`.
   */
  patchErrors(
    value: ValidationErrors | ReadonlyMap<ControlId, ValidationErrors>,
    options?: ControlEventOptions,
  ): void;

  markTouched(value: boolean, options?: ControlEventOptions): void;

  markChanged(value: boolean, options?: ControlEventOptions): void;

  markReadonly(value: boolean, options?: ControlEventOptions): void;

  markSubmitted(value: boolean, options?: ControlEventOptions): void;

  markPending(
    value: boolean,
    options?: ControlEventOptions & { source?: ControlId },
  ): void;
  markPending(
    value: ReadonlyMap<ControlId, true>,
    options?: ControlEventOptions,
  ): void;

  markDisabled(value: boolean, options?: ControlEventOptions): void;

  focus(value?: boolean, options?: ControlEventOptions): void;

  setValidators(
    value: ValidatorFn | ValidatorFn[] | null,
    options?: ControlEventOptions & { source?: ControlId },
  ): void;
  setValidators(
    value: ReadonlyMap<ControlId, ValidatorFn>,
    options?: ControlEventOptions,
  ): void;

  /**
   * Returns an observable of this control's state in the form of
   * StateChange objects which can be used to make another control
   * identical to this one. This observable will complete upon
   * replaying the necessary state changes.
   */
  replayState(
    options?: ControlEventOptions,
  ): Observable<ProcessedControlEvent<string, any>>;

  /**
   * A convenience method for emitting an arbitrary control event.
   */
  emitEvent<T extends string, V>(
    event: Pick<ControlEvent<T, V>, 'type' | 'value'> &
      Partial<ControlEvent<T, V>>,
  ): void;
}
