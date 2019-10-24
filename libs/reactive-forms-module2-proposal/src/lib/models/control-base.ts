import {
  AbstractControl,
  ControlId,
  ValidatorFn,
  ValidationErrors,
  ControlSource,
  ControlEvent,
  ControlEventOptions,
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
import { Observable, from } from 'rxjs';

export type ControlBaseValue<T> = T extends ControlBase<infer V, any> ? V : any;
export type ControlBaseData<T> = T extends ControlBase<any, infer D> ? D : any;

export interface IControlBaseArgs<Value = any, Data = any> {
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

export type OutputControlEvent = Observable<
  Omit<ControlEvent<string, any>, 'stateChange'> & { stateChange: boolean }
>;

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

export abstract class ControlBase<
  Value = any,
  Data = any
> extends AbstractControl<Value, Data> {
  data: Data;

  source = new ControlSource<ControlEvent<string, any>>();

  events = (this.source.pipe(
    filter(
      // make sure we don't process an event we already processed
      event => !event.applied.includes(this.id),
    ),
    tap(event => {
      // Add our ID to the `applied` array to indicate that this control
      // has already processed this event and doesn't need to
      // do so again.
      //
      // It's important that we `push()` the new ID in to keep the same
      // array reference
      event.applied.push(this.id);

      // processEvent adds the `stateChange` property
      this.processEvent(event);
    }),
    share(),
  ) as any) as Observable<
    ControlEvent<string, any> & { stateChange?: boolean }
  >;

  protected _value: Value;
  get value() {
    return this._value;
  }

  protected _errors: ValidationErrors | null = null;
  get errors() {
    return this._errors;
  }

  errorsStore: ReadonlyMap<ControlId, ValidationErrors> = new Map<
    ControlId,
    ValidationErrors
  >();

  protected _disabled = false;
  get disabled() {
    return this._disabled;
  }

  get valid() {
    return !this.errors;
  }

  get invalid() {
    return !!this.errors;
  }

  pendingStore: ReadonlyMap<ControlId, true> = new Map<ControlId, true>();

  protected _pending = false;
  get pending() {
    return this._pending;
  }

  get status() {
    // prettier-ignore
    return this.disabled ? 'DISABLED'
      : this.pending ? 'PENDING'
      : this.valid ? 'VALID'
      : 'INVALID';
  }

  focusChanges: Observable<boolean> = this.events.pipe(
    filter(({ type, noEmit }) => type === 'focus' && !noEmit),
    map(state => state.value),
    share(),
  );

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

  validatorStore: ReadonlyMap<ControlId, ValidatorFn> = new Map<
    ControlId,
    ValidatorFn
  >();

  protected _validator: ValidatorFn | null = null;
  get validator() {
    return this._validator;
  }

  constructor(value?: Value, options: IControlBaseArgs<Value, Data> = {}) {
    super();
    if (options.id) this.id = options.id;

    this.data = options.data as Data;

    // need to maintain one subscription for the
    // observable to fire and the logic to process
    this.events.subscribe();

    this._disabled = !!options.disabled;
    this._readonly = !!options.readonly;
    this._submitted = !!options.submitted;
    this._touched = !!options.touched;
    this._changed = !!options.changed;

    this._value = value!;

    if (options.pending instanceof Map) {
      this.pendingStore = new Map(options.pending);
    } else if (options.pending) {
      this.pendingStore = new Map([[this.id, true]]);
    } else {
      this.pendingStore = new Map();
    }

    this._pending = Array.from(this.pendingStore.values()).some(val => val);

    if (options.validators instanceof Map) {
      this.validatorStore = new Map(options.validators);
    } else if (!options.validators) {
      this.validatorStore = new Map();
    } else {
      this.validatorStore = new Map([
        [this.id, composeValidators(options.validators as ValidatorFn)!],
      ]);
    }

    this._validator = composeValidators(
      Array.from(this.validatorStore.values()),
    );

    this.updateValidation();
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
        ({ noEmit, stateChange }) =>
          !!stateChange && (options.ignoreNoEmit || !noEmit),
      ),
      // here we load the current value into the `distinctUntilChanged`
      // filter (and skip it) so that the first emission is a change.
      startWith({} as ControlEvent<string, any>),
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
        ({ noEmit, stateChange }) =>
          !!stateChange && (options.ignoreNoEmit || !noEmit),
      ),
      startWith({} as ControlEvent<string, any>),
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
    this.source.next(this.buildEvent('value', value, options));
  }

  patchValue(value: any, options?: ControlEventOptions) {
    this.setValue(value, options);
  }

  setErrors(
    value: ValidationErrors | null | ReadonlyMap<ControlId, ValidationErrors>,
    options: ControlEventOptions = {},
  ) {
    if (value instanceof Map) {
      this.source.next(this.buildEvent('errorsStore', value, options));
    } else {
      const source = options.source || this.id;

      this.source.next({
        source,
        applied: [],
        type: 'errors',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  patchErrors(
    value: ValidationErrors | ReadonlyMap<ControlId, ValidationErrors>,
    options: ControlEventOptions = {},
  ) {
    if (value instanceof Map) {
      const newValue = new Map([
        ...this.errorsStore.entries(),
        ...value.entries(),
      ]);

      this.source.next(this.buildEvent('errorsStore', newValue, options));
    } else {
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

      this.source.next({
        source,
        applied: [],
        type: 'errors',
        value: newValue,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  markTouched(value: boolean, options?: ControlEventOptions) {
    if (value !== this._touched) {
      this.source.next(this.buildEvent('touched', value, options));
    }
  }

  markChanged(value: boolean, options?: ControlEventOptions) {
    if (value !== this._changed) {
      this.source.next(this.buildEvent('changed', value, options));
    }
  }

  markReadonly(value: boolean, options?: ControlEventOptions) {
    if (value !== this._readonly) {
      this.source.next(this.buildEvent('readonly', value, options));
    }
  }

  markSubmitted(value: boolean, options?: ControlEventOptions) {
    if (value !== this._submitted) {
      this.source.next(this.buildEvent('submitted', value, options));
    }
  }

  markPending(
    value: boolean | ReadonlyMap<ControlId, true>,
    options: ControlEventOptions = {},
  ) {
    this.source.next(
      this.buildEvent(
        value instanceof Map ? 'pendingStore' : 'pending',
        value,
        options,
      ),
    );
  }

  markDisabled(value: boolean, options?: ControlEventOptions) {
    if (value !== this._disabled) {
      this.source.next(this.buildEvent('disabled', value, options));
    }
  }

  focus(value?: boolean, options?: ControlEventOptions) {
    this.source.next(
      this.buildEvent('focus', value === undefined ? true : value, options),
    );
  }

  setValidators(
    value:
      | ValidatorFn
      | ValidatorFn[]
      | ReadonlyMap<ControlId, ValidatorFn>
      | null,
    options: ControlEventOptions = {},
  ) {
    this.source.next(
      this.buildEvent(
        value instanceof Map ? 'validatorStore' : 'validators',
        value,
        options,
      ),
    );
  }

  replayState(options: ControlEventOptions = {}) {
    const state: Array<
      ControlEvent<string, any> & { stateChange?: boolean }
    > = [
      this.buildEvent('touched', this.touched, options),
      this.buildEvent('changed', this.changed, options),
      this.buildEvent('readonly', this.readonly, options),
      this.buildEvent('submitted', this.submitted, options),
      this.buildEvent('disabled', this.disabled, options),
      this.buildEvent('pendingStore', this.pendingStore, options),
      this.buildEvent('validatorStore', this.validatorStore, options),
      this.buildEvent('errorsStore', this.errorsStore, options),
    ];

    state.push(this.buildEvent('value', this.value, options));

    return from(state).pipe(
      map(event => {
        // we reset the applied array so that this saved
        // state change can be applied to the same control
        // multiple times
        (event as any).applied = [];
        event.stateChange = true;
        return event;
      }),
    );
  }

  protected buildEvent<T extends string, V>(
    type: T,
    value: V,
    { noEmit, meta, source }: ControlEventOptions = {},
    custom: { [key: string]: any } = {},
  ): ControlEvent<T, V> {
    return {
      source: source || this.id,
      applied: [],
      type,
      value,
      noEmit,
      meta,
      ...custom,
    };
  }

  protected updateValidation({ noEmit, meta }: ControlEventOptions = {}) {
    // Validation lifecycle hook
    this.emitEvent({
      type: 'validation',
      value: 'internalStart',
      controlValue: this.value,
      noEmit,
      meta,
    });

    const validationResult: (Readonly<ValidationErrors>) | null = this.validator
      ? this.validator(this)
      : null;

    this.setErrors(validationResult, { noEmit, meta });

    // Validation lifecycle hook
    this.emitEvent({
      type: 'validation',
      value: 'internalEnd',
      controlValue: this.value,
      validationResult,
      noEmit,
      meta,
    });

    // Validation lifecycle hook
    this.emitEvent({
      type: 'validation',
      value: 'end',
      controlValue: this.value,
      controlValid: this.valid,
      noEmit,
      meta,
    });
  }

  private processErrors() {
    return Array.from(this.errorsStore.values()).reduce(
      (prev, curr) => {
        if (!curr) return prev;
        if (!prev) return curr;
        return { ...prev, ...curr };
      },
      null as ValidationErrors | null,
    );
  }

  /**
   * Processes a control event. If the event is recognized by this control,
   * `processEvent()` will return `true`. Otherwise, `false` is returned.
   */
  protected processEvent(
    event: ControlEvent<string, any> & { stateChange?: boolean },
  ) {
    switch (event.type) {
      case 'value': {
        event.stateChange = true;
        this._value = event.value;
        this.updateValidation(event);

        return true;
      }
      case 'errors': {
        event.stateChange = true;
        if (event.value && Object.entries(event.value).length !== 0) {
          (this.errorsStore as Map<ControlId, ValidationErrors>).set(
            event.source,
            event.value,
          );
        } else {
          (this.errorsStore as Map<ControlId, ValidationErrors>).delete(
            event.source,
          );
        }

        this._errors = this.processErrors();

        return true;
      }
      case 'errorsStore': {
        event.stateChange = true;
        this.errorsStore = new Map(event.value);

        this._errors = this.processErrors();

        return true;
      }
      case 'submitted': {
        event.stateChange = true;
        this._submitted = event.value;
        return true;
      }
      case 'touched': {
        event.stateChange = true;
        this._touched = event.value;
        return true;
      }
      case 'changed': {
        event.stateChange = true;
        this._changed = event.value;
        return true;
      }
      case 'readonly': {
        event.stateChange = true;
        this._readonly = event.value;
        return true;
      }
      case 'disabled': {
        event.stateChange = true;
        this._disabled = event.value;
        return true;
      }
      case 'pending': {
        event.stateChange = true;
        if (event.value) {
          (this.pendingStore as Map<ControlId, true>).set(event.source, true);
        } else {
          (this.pendingStore as Map<ControlId, true>).delete(event.source);
        }

        this._pending = Array.from(this.pendingStore.values()).some(val => val);

        return true;
      }
      case 'pendingStore': {
        event.stateChange = true;
        this.pendingStore = new Map(event.value);

        this._pending = Array.from(this.pendingStore.values()).some(val => val);

        return true;
      }
      case 'validators': {
        event.stateChange = true;
        if (event.value === null) {
          (this.validatorStore as Map<ControlId, ValidatorFn>).delete(
            event.source,
          );
        } else {
          (this.validatorStore as Map<ControlId, ValidatorFn>).set(
            event.source,
            composeValidators(event.value)!,
          );
        }

        this._validator = composeValidators(
          Array.from(this.validatorStore.values()),
        );

        this.updateValidation(event);
        return true;
      }
      case 'validatorStore': {
        event.stateChange = true;
        this.validatorStore = new Map(event.value);

        this._validator = composeValidators(
          Array.from(this.validatorStore.values()),
        );

        this.updateValidation(event);
        return true;
      }
      case 'data': {
        event.stateChange = true;
        this.data = event.value;
        return true;
      }
    }

    return false;
  }
}
