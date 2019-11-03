import {
  AbstractControl,
  ControlId,
  ValidatorFn,
  ValidationErrors,
  ControlSource,
  PartialControlEvent,
  ControlEventOptions,
  DeepReadonly,
  ControlEvent,
  ValidationEvent,
} from './abstract-control';
import {
  filter,
  tap,
  share,
  map,
  distinctUntilChanged,
  startWith,
  shareReplay,
  skip,
} from 'rxjs/operators';
import { Observable, from, merge, of } from 'rxjs';
import { isMapEqual, isTruthy, isProcessed, pluckOptions } from './util';

export type ControlBaseValue<T> = T extends ControlBase<infer V, any> ? V : any;
export type ControlBaseData<T> = T extends ControlBase<any, infer D> ? D : any;

export interface StateChange extends ControlEvent {
  type: 'StateChange';
  changes: ReadonlyMap<string, any>;
}

export interface FocusEvent extends ControlEvent {
  type: 'Focus';
  focus: boolean;
}

export interface ValidationStartEvent<T = any> extends ValidationEvent {
  label: 'Start';
  controlValue: T;
}

export interface ValidationInternalEvent<T = any> extends ValidationEvent {
  label: 'InternalComplete';
  controlValue: T;
  validationResult: ValidationErrors | null;
}

export interface ValidationEndEvent<T = any> extends ValidationEvent {
  label: 'End';
  controlValue: T;
  controlValid: boolean;
}

export interface IControlBaseArgs<Data = any> {
  data?: Data;
  validators?:
    | ValidatorFn
    | ValidatorFn[]
    | null
    | ReadonlyMap<ControlId, ValidatorFn>;
  disabled?: boolean;
  readonly?: boolean;
  pending?: boolean | ReadonlyMap<ControlId, true>;
  submitted?: boolean;
  touched?: boolean;
  changed?: boolean;
  id?: ControlId;
}

export function composeValidators(
  validators: undefined | null | ValidatorFn | ValidatorFn[],
): null | ValidatorFn {
  if (!validators || (Array.isArray(validators) && validators.length === 0)) {
    return null;
  }

  if (Array.isArray(validators)) {
    return control =>
      validators.reduce((prev: ValidationErrors | null, curr: ValidatorFn) => {
        const errors = curr(control);
        return errors ? { ...errors, ...prev } : prev;
      }, null);
  }

  return validators;
}

export abstract class ControlBase<Value = any, Data = any>
  implements AbstractControl<Value, Data> {
  id: ControlId;

  data: Data;

  source = new ControlSource<PartialControlEvent>();

  readonly atomic = new Map<ControlId, (event: ControlEvent) => ((() => void) | null)>();

  protected _events = new ControlSource<ControlEvent>();
  events: Observable<
    ControlEvent & { [key: string]: any }
  > = this._events.asObservable();

  protected _value: Value;
  get value() {
    return this._value as DeepReadonly<Value>;
  }

  protected _errors: ValidationErrors | null = null;
  get errors() {
    return this._errors;
  }

  protected _errorsStore: ReadonlyMap<ControlId, ValidationErrors> = new Map<
    ControlId,
    ValidationErrors
  >();
  get errorsStore() {
    return this._errorsStore;
  }

  protected _disabled = false;
  get disabled() {
    return this._disabled;
  }
  get enabled() {
    return !this._disabled;
  }

  get valid() {
    return !this._errors;
  }
  get invalid() {
    return !!this._errors;
  }

  protected _pendingStore: ReadonlyMap<ControlId, true> = new Map<
    ControlId,
    true
  >();
  get pendingStore() {
    return this._pendingStore;
  }

  protected _pending = false;
  get pending() {
    return this._pending;
  }

  get status() {
    // prettier-ignore
    return this._disabled ? 'DISABLED'
      : this._pending ? 'PENDING'
      : this.valid ? 'VALID'
      : 'INVALID';
  }

  focusChanges: Observable<boolean> = this.events.pipe(
    filter(({ type, noEmit }) => type === 'focus' && !noEmit),
    map(event => (event as FocusEvent).focus),
    share(),
  );

  protected _validationEvents = new ControlSource<ValidationEvent>();
  validationEvents = this._validationEvents.asObservable();

  protected _readonly = false;
  get readonly() {
    return this._readonly;
  }

  protected _submitted = false;
  get submitted() {
    return this._submitted;
  }

  protected _touched = false;
  get touched() {
    return this._touched;
  }

  protected _changed = false;

  get changed() {
    return this._changed;
  }

  get dirty() {
    return this._touched || this._changed;
  }

  protected _validatorStore: ReadonlyMap<ControlId, ValidatorFn> = new Map<
    ControlId,
    ValidatorFn
  >();
  get validatorStore() {
    return this._validatorStore;
  }

  protected _validator: ValidatorFn | null = null;
  get validator() {
    return this._validator;
  }

  constructor(controlId: ControlId, value?: Value, options: IControlBaseArgs<Data> = {}) {
    // need to provide ControlId in constructor otherwise
    // initial errors will have incorrect source ID
    this.id = controlId;

    this.data = options.data as Data;

    // need to maintain one subscription for the
    // observable to fire and the logic to process
    this.source
      .pipe(
        filter(
          // make sure we don't process an event we already processed
          event => !event.processed.includes(this.id),
        ),
      )
      .subscribe(event => {
        event.processed.push(this.id);
        if (!event.meta) event.meta = {};
        if (!event.id) event.id = AbstractControl.eventId();

        const newEvent = this.processEvent(event as ControlEvent);

        if (newEvent) {
          const callbacks: Array<() => void> = [];

          this.atomic.forEach(transaction => {
            const fn = transaction(newEvent);

            if (fn) callbacks.push(fn);
          });

          this._events.next(newEvent);

          callbacks.forEach(fn => fn());
        }
      });

    this._disabled = !!options.disabled;
    this._readonly = !!options.readonly;
    this._submitted = !!options.submitted;
    this._touched = !!options.touched;
    this._changed = !!options.changed;

    this._value = value!;

    if (options.pending instanceof Map) {
      this._pendingStore = new Map(options.pending);
    } else if (options.pending) {
      this._pendingStore = new Map([[this.id, true]]);
    } else {
      this._pendingStore = new Map();
    }

    this._pending = Array.from(this.pendingStore.values()).some(val => val);

    if (options.validators instanceof Map) {
      this._validatorStore = new Map(options.validators);
    } else if (!options.validators) {
      this._validatorStore = new Map();
    } else {
      this._validatorStore = new Map([
        [this.id, composeValidators(options.validators as ValidatorFn)!],
      ]);
    }

    this._validator = composeValidators(
      Array.from(this.validatorStore.values()),
    );

    this.updateValidation(new Map());
  }

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
  observeChanges(
    a: string | string[],
    b?: string | { ignoreNoEmit?: boolean },
    c?: string | { ignoreNoEmit?: boolean },
    d?: string | { ignoreNoEmit?: boolean },
    e?: string | { ignoreNoEmit?: boolean },
    f?: string | { ignoreNoEmit?: boolean },
    g?: string | { ignoreNoEmit?: boolean },
    h?: string | { ignoreNoEmit?: boolean },
    i?: string | { ignoreNoEmit?: boolean },
    j?: string | { ignoreNoEmit?: boolean },
    k?: string | { ignoreNoEmit?: boolean },
    o?: { ignoreNoEmit?: boolean },
  ) {
    const props: string[] = [];

    if (Array.isArray(a)) {
      props.push(...a);
    } else {
      props.push(a);
    }

    const args = [b, c, d, e, f, g, h, i, j, k, o].filter(v => !!v);

    const options =
      typeof args[args.length - 1] === 'object'
        ? (args.pop() as { ignoreNoEmit?: boolean })
        : {};

    props.push(...(args as string[]));

    return this.events.pipe(
      filter(
        ({ noEmit, type }) =>
          type === 'StateChange' && (options.ignoreNoEmit || !noEmit),
      ),
      // here we load the current value into the `distinctUntilChanged`
      // filter (and skip it) so that the first emission is a change.
      startWith({} as PartialControlEvent),
      map(() =>
        props.reduce(
          (prev, curr) => {
            if (typeof prev === 'object' && curr in prev) {
              return prev[curr];
            }

            return undefined;
          },
          this as any,
        ),
      ),
      distinctUntilChanged(),
      skip(1),
      share(),
    );
  }

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
  observe(
    a: string | string[],
    b?: string | { ignoreNoEmit?: boolean },
    c?: string | { ignoreNoEmit?: boolean },
    d?: string | { ignoreNoEmit?: boolean },
    e?: string | { ignoreNoEmit?: boolean },
    f?: string | { ignoreNoEmit?: boolean },
    g?: string | { ignoreNoEmit?: boolean },
    h?: string | { ignoreNoEmit?: boolean },
    i?: string | { ignoreNoEmit?: boolean },
    j?: string | { ignoreNoEmit?: boolean },
    k?: string | { ignoreNoEmit?: boolean },
    o?: { ignoreNoEmit?: boolean },
  ) {
    const props: string[] = [];

    if (Array.isArray(a)) {
      props.push(...a);
    } else {
      props.push(a);
    }

    const args = [b, c, d, e, f, g, h, i, j, k, o].filter(v => !!v);

    const options =
      typeof args[args.length - 1] === 'object'
        ? (args.pop() as { ignoreNoEmit?: boolean })
        : {};

    props.push(...(args as string[]));

    return this.events.pipe(
      filter(
        ({ noEmit, type }) =>
          type === 'StateChange' && (options.ignoreNoEmit || !noEmit),
      ),
      startWith({} as PartialControlEvent),
      map(() =>
        props.reduce(
          (prev, curr) => {
            if (typeof prev === 'object' && curr in prev) {
              return prev[curr];
            }

            return undefined;
          },
          this as any,
        ),
      ),
      distinctUntilChanged(),
      shareReplay(1),
    );
  }

  setValue(value: Value, options?: ControlEventOptions) {
    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['value', value]]),
      ...pluckOptions(options),
    });
  }

  patchValue(value: any, options?: ControlEventOptions) {
    this.setValue(value, options);
  }

  setErrors(
    value: ValidationErrors | null | ReadonlyMap<ControlId, ValidationErrors>,
    options: ControlEventOptions = {},
  ) {
    if (isProcessed(this.id, options)) return;

    if (value instanceof Map) {
      if (isMapEqual(this.errorsStore, value)) return;

      this.emitEvent<StateChange>({
        type: 'StateChange',
        changes: new Map<string, any>([['errorsStore', value]]),
        ...pluckOptions(options),
      });

      return;
    }

    const store = new Map(this.errorsStore);

    if (!value) {
      store.delete(options.source || this.id);
    } else {
      store.set(options.source || this.id, value);
    }

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['errorsStore', store]]),
      ...pluckOptions(options),
    });
  }

  patchErrors(
    value: ValidationErrors | ReadonlyMap<ControlId, ValidationErrors>,
    options: ControlEventOptions = {},
  ) {
    if (isProcessed(this.id, options)) return;

    if (value instanceof Map) {
      if (isMapEqual(this.errorsStore, value)) return;

      this.emitEvent<StateChange>({
        type: 'StateChange',
        changes: new Map<string, any>([
          [
            'errorsStore',
            new Map<ControlId, ValidationErrors>([
              ...this.errorsStore,
              ...value,
            ]),
          ],
        ]),
        ...pluckOptions(options),
      });

      return;
    }

    const source = options.source || this.id;

    let newValue: ValidationErrors = value;

    if (Object.entries(newValue).length === 0) return;

    let existingValue = this.errorsStore.get(source);

    if (existingValue) {
      existingValue = { ...existingValue };

      Object.entries(newValue).forEach(([key, err]) => {
        if (err === null) {
          delete existingValue![key];
        } else {
          existingValue![key] = err;
        }
      });

      newValue = existingValue;
    }

    const store = new Map(this.errorsStore);

    store.set(options.source || this.id, newValue);

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['errorsStore', store]]),
      ...pluckOptions(options),
    });
  }

  markTouched(value: boolean, options?: ControlEventOptions) {
    if (isProcessed(this.id, options) || value === this._touched) return;

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['touched', value]]),
      ...pluckOptions(options),
    });
  }

  markChanged(value: boolean, options?: ControlEventOptions) {
    if (isProcessed(this.id, options) || value === this._changed) return;

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['changed', value]]),
      ...pluckOptions(options),
    });
  }

  markReadonly(value: boolean, options?: ControlEventOptions) {
    if (isProcessed(this.id, options) || value === this._readonly) return;

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['readonly', value]]),
      ...pluckOptions(options),
    });
  }

  markSubmitted(value: boolean, options?: ControlEventOptions) {
    if (isProcessed(this.id, options) || value === this._submitted) return;

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['submitted', value]]),
      ...pluckOptions(options),
    });
  }

  markPending(
    value: boolean | ReadonlyMap<ControlId, true>,
    options: ControlEventOptions = {},
  ) {
    if (isProcessed(this.id, options)) return;

    const store =
      value instanceof Map
        ? value
        : new Map([...this.pendingStore, [options.source || this.id, value]]);

    if (isMapEqual(this.pendingStore, store)) return;

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['pendingStore', store]]),
      ...pluckOptions(options),
    });
  }

  markDisabled(value: boolean, options?: ControlEventOptions) {
    if (isProcessed(this.id, options) || value === this._disabled) return;

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['disabled', value]]),
      ...pluckOptions(options),
    });
  }

  focus(value?: boolean, options?: ControlEventOptions) {
    this.emitEvent<FocusEvent>({
      type: 'Focus',
      focus: value === undefined ? true : value,
      ...pluckOptions(options),
    });
  }

  setValidators(
    value:
      | ValidatorFn
      | ValidatorFn[]
      | ReadonlyMap<ControlId, ValidatorFn>
      | null,
    options: ControlEventOptions = {},
  ) {
    if (isProcessed(this.id, options)) return;

    if (value instanceof Map) {
      this.emitEvent<StateChange>({
        type: 'StateChange',
        changes: new Map<string, any>([['validatorStore', value]]),
        ...pluckOptions(options),
      });

      return;
    }

    const fn = composeValidators(value as ValidatorFn | ValidatorFn[] | null);

    const store = new Map(this.validatorStore);

    if (!fn) {
      store.delete(options.source || this.id);
    } else {
      store.set(options.source || this.id, fn);
    }

    this.emitEvent<StateChange>({
      type: 'StateChange',
      changes: new Map<string, any>([['validatorStore', store]]),
      ...pluckOptions(options),
    });
  }

  replayState(options: ControlEventOptions = {}): Observable<StateChange> {
    return of({
      id: '',
      source: options.source || this.id,
      processed: [this.id],
      type: 'StateChange' as const,
      changes: new Map<string, any>([
        ['disabled', this._disabled],
        ['errorsStore', this.errorsStore],
        ['pendingStore', this.pendingStore],
        ['validatorStore', this.validatorStore],
        ['value', this._value],
        ['touched', this._touched],
        ['changed', this._changed],
        ['readonly', this._readonly],
        ['submitted', this._submitted],
      ]),
      noEmit: options.noEmit,
      meta: options.meta || {},
    }).pipe(
      map(event => {
        // we reset the applied array so that this saved
        // state change can be applied to the same control
        // multiple times
        event.id = AbstractControl.eventId();
        (event as any).processed = [];
        return event;
      }),
    );
  }

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
  ): void {
    this.source.next({
      source: this.id,
      processed: [],
      ...event,
    });
  }

  equalValue(value: Value): value is Value {
    return this._value === value;
  }

  [AbstractControl.ABSTRACT_CONTROL_INTERFACE]() {
    return this;
  }

  protected updateValidation(
    changes: Map<any, any>,
    options: Omit<ControlEventOptions, 'processed' | 'source'> = {},
  ) {
    // Validation lifecycle hook
    this._validationEvents.next({
      type: 'Validation',
      label: 'Start',
      controlValue: this._value,
      ...pluckOptions(options),
      source: this.id,
      processed: [],
    } as ValidationStartEvent<Value>);

    const errors: (Readonly<ValidationErrors>) | null = this.validator
      ? this.validator(this)
      : null;

    const errorsStore = new Map(this.errorsStore);
    let change = false;

    if (errors && Object.keys(errors).length !== 0) {
      change = true;
      errorsStore.set(this.id, errors);
    } else if (errorsStore.delete(this.id)) {
      change = true;
    }

    if (change) {
      this._errorsStore = errorsStore;
      this._errors = Array.from(errorsStore.values()).reduce(
        (prev, curr) => {
          if (!curr) return prev;
          if (!prev) return curr;
          return { ...prev, ...curr };
        },
        null as ValidationErrors | null,
      );

      changes.set('errorsStore', new Map(errorsStore));
    }

    // Validation lifecycle hook
    this._validationEvents.next({
      type: 'Validation',
      label: 'InternalComplete',
      controlValue: this._value,
      validationResult: errors,
      ...pluckOptions(options),
      source: this.id,
      processed: [],
    } as ValidationInternalEvent<Value>);

    // Validation lifecycle hook
    this._validationEvents.next({
      type: 'Validation',
      label: 'End',
      controlValue: this._value,
      controlValid: this.valid,
      ...pluckOptions(options),
      source: this.id,
      processed: [],
    } as ValidationEndEvent<Value>);
  }

  protected processEvent(event: ControlEvent): ControlEvent | null {
    switch (event.type) {
      case 'StateChange': {
        const changes = new Map<string, any>();

        (event as StateChange).changes.forEach((value, prop) => {
          this.processStateChange({
            event: event as StateChange,
            value,
            prop,
            changes,
          });
        });

        if (changes.size === 0) return null;

        return {
          ...event,
          changes,
        } as StateChange;
      }
    }

    return null;
  }

  /**
   * Processes a control event. If the event is recognized by this control,
   * `processEvent()` will return `true`. Otherwise, `false` is returned.
   *
   * In general, ControlEvents should not emit additional ControlEvents
   */
  protected processStateChange(args: {
    event: StateChange;
    value: any;
    prop: string;
    changes: Map<string, any>;
  }): boolean {
    const { event, value, prop, changes } = args;

    switch (prop) {
      case 'value': {
        if (this.equalValue(value)) return true;
        this._value = value;
        // Note: following the addition of the `atomic` API, I'm not sure 
        // if the below comment is still true. Not going to bother testing
        // now though:
        // 
        // The updateValidation call ("errorsStore" change) *must* come before
        // the "value" change. If not, then the errors
        // of linked controls will not be properly cleared.
        this.updateValidation(changes, event);
        changes.set('value', value);
        return true;
      }
      case 'submitted': {
        if (this._submitted === value) return true;
        this._submitted = value;
        changes.set('submitted', value);
        return true;
      }
      case 'touched': {
        if (this._touched === value) return true;
        this._touched = value;
        changes.set('touched', value);
        return true;
      }
      case 'changed': {
        if (this._changed === value) return true;
        this._changed = value;
        changes.set('changed', value);
        return true;
      }
      case 'readonly': {
        if (this._readonly === value) return true;
        this._readonly = value;
        changes.set('readonly', value);
        return true;
      }
      case 'disabled': {
        if (this._disabled === value) return true;
        this._disabled = value;
        changes.set('disabled', value);
        return true;
      }
      case 'errorsStore': {
        if (isMapEqual(this._errorsStore, value)) return true;
        this._errorsStore = new Map(value);
        const errors = Array.from(this.errorsStore.values()).reduce(
          (prev, err) => ({
            ...prev,
            ...err,
          }),
          {} as ValidationErrors,
        );
        this._errors = Object.keys(errors).length > 0 ? errors : null;
        changes.set('errorsStore', new Map(this._errorsStore));
        return true;
      }
      case 'pendingStore': {
        if (isMapEqual(this._pendingStore, value)) return true;
        this._pendingStore = new Map(value);
        this._pending = Array.from(this._pendingStore.values()).some(
          val => val,
        );
        changes.set('pendingStore', new Map(this._pendingStore));
        return true;
      }
      case 'validatorStore': {
        if (isMapEqual(this._validatorStore, value)) return true;
        this._validatorStore = new Map(value);
        this._validator = composeValidators(
          Array.from(this._validatorStore.values()),
        );
        // As with the "value" change, I think "updateValidation"
        // needs to come before the "validatorStore" change is set
        this.updateValidation(changes, event);
        changes.set('validatorStore', new Map(this._validatorStore));
        return true;
      }
      default: {
        return false;
      }
    }
  }
}
