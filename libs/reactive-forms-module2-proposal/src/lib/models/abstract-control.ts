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

export interface PartialControlEvent {
  id?: string;
  source: ControlId;
  readonly processed: ControlId[];
  type: string;
  meta?: { [key: string]: any };
  noEmit?: boolean;
}

export namespace ControlEvent {
  export const DELETE = Symbol('CONTROL_EVENT_DELETE_TOKEN');
}

export interface ControlEvent extends PartialControlEvent {
  id: string;
  meta: { [key: string]: any };
}

export interface ValidationEvent extends ControlEvent {
  type: 'Validation';
  label: string;
}

export interface ControlEventOptions {
  noEmit?: boolean;
  meta?: { [key: string]: any };
  eventId?: string;
  source?: ControlId;
  processed?: ControlId[];
}

export type DeepReadonly<T> = T extends Array<infer R>
  ? DeepReadonlyArray<R>
  : T extends Function
  ? T
  : T extends object
  ? DeepReadonlyObject<T>
  : T;

interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

type DeepReadonlyObject<T> = {
  readonly [P in keyof T]: DeepReadonly<T[P]>;
};

/**
 * ControlSource is a special rxjs Subject which never
 * completes.
 */
export class ControlSource<T> extends Subject<T> {
  /** NOOP: Complete does nothing */
  complete() {}
}

let _id = 0;
let _eventId = 0;

export namespace AbstractControl {
  export const ABSTRACT_CONTROL_INTERFACE = Symbol(
    '@@AbstractControlInterface',
  );
  export function id() {
    return Symbol(`control-${_id++}`);
  }
  export function eventId() {
    return (_eventId++).toString();
  }
  export function isAbstractControl(object?: any): object is AbstractControl {
    return (
      typeof object === 'object' &&
      typeof object[AbstractControl.ABSTRACT_CONTROL_INTERFACE] ===
        'function' &&
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
  readonly id: ControlId;

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
  source: ControlSource<PartialControlEvent>;

  /**
   * ***Advanced API***
   *
   * The "atomic" map is used by controls + parent ControlContainers to ensure
   * that parent/child state changes happen atomically before any events are
   * emitted.
   */
  readonly atomic: Map<ControlId, (event: ControlEvent) => (() => void) | null>;

  /** An observable of all events for this AbstractControl */
  events: Observable<ControlEvent & { [key: string]: any }>;

  readonly value: DeepReadonly<Value>;

  readonly errors: ValidationErrors | null;

  /**
   * A map of validation errors keyed to the source which added them.
   */
  readonly errorsStore: ReadonlyMap<ControlId, ValidationErrors>;

  readonly disabled: boolean;
  readonly enabled: boolean;
  readonly valid: boolean;
  readonly invalid: boolean;
  readonly pending: boolean;

  /**
   * A map of pending states keyed to the source which added them.
   * So long as there are any `true` boolean values, this control's
   * `pending` property will be `true`.
   */
  readonly pendingStore: ReadonlyMap<ControlId, true>;

  readonly status: 'DISABLED' | 'PENDING' | 'VALID' | 'INVALID';

  /**
   * focusChanges allows consumers to be notified when this
   * form control should be focused or blurred.
   */
  focusChanges: Observable<boolean>;

  /**
   * These are special, internal events which signal when this control is
   * starting or finishing validation.
   *
   * These events are not emitted from the `events` observable.
   */
  validationEvents: Observable<ValidationEvent>;

  readonly readonly: boolean;
  readonly submitted: boolean;
  readonly touched: boolean;
  readonly changed: boolean;
  readonly dirty: boolean;

  /**
   * A map of ValidatorFn keyed to the source which added them.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  readonly validatorStore: ReadonlyMap<ControlId, ValidatorFn>;

  readonly validator: ValidatorFn | null;

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

  equalValue(value: Value): value is Value;

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
    value: boolean | ReadonlyMap<ControlId, true>,
    options?: ControlEventOptions,
  ): void;

  markDisabled(value: boolean, options?: ControlEventOptions): void;

  focus(value?: boolean, options?: ControlEventOptions): void;

  setValidators(
    value:
      | ValidatorFn
      | ValidatorFn[]
      | null
      | ReadonlyMap<ControlId, ValidatorFn>,
    options?: ControlEventOptions,
  ): void;

  /**
   * Returns an observable of this control's state in the form of
   * StateChange objects which can be used to make another control
   * identical to this one. This observable will complete upon
   * replaying the necessary state changes.
   */
  replayState(options?: ControlEventOptions): Observable<ControlEvent>;

  /**
   * A convenience method for emitting an arbitrary control event.
   */
  emitEvent<
    T extends PartialControlEvent = PartialControlEvent & { [key: string]: any }
  >(
    event: Partial<
      Pick<T, 'id' | 'meta' | 'source' | 'processed' | 'noEmit' | 'meta'>
    > &
      Omit<T, 'id' | 'meta' | 'source' | 'processed' | 'noEmit' | 'meta'> & {
        type: string;
      },
  ): void;
}
