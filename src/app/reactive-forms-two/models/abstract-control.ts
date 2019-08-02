import { Observable, Subject, from } from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  tap,
  map,
  share,
  take,
  shareReplay,
  startWith,
} from 'rxjs/operators';
import { ValidationErrors } from '@angular/forms';
import isEqual from 'lodash-es/isEqual';

export type ValidatorFn = (
  control: AbstractControl<any, any>,
) => ValidationErrors | null;
export type AsyncValidatorFn = (
  control: AbstractControl<any, any>,
) => Promise<ValidationErrors | null>;

export type AbstractControlValue<T> = T extends AbstractControl<infer V>
  ? V
  : any;
export type AbstractControlData<T> = T extends AbstractControl<any, infer D>
  ? D
  : any;

export interface StateChange<Type extends string, Value> {
  sources: (symbol | string)[];
  type: Type;
  value: Value;
  noEmit?: boolean;
  meta?: { [key: string]: any };
  [key: string]: any;
}

export interface IAbstractControlArgs<Value = any, Data = any> {
  value?: Value;
  data?: Data;
  validators?: ValidatorFn | ValidatorFn[];
  asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[];
  disabled?: boolean;
  readonly?: boolean;
  pending?: boolean;
  submitted?: boolean;
  touched?: boolean;
  changed?: boolean;
}

export interface IAbstractControlResetOptions {
  skipValue?: boolean;
  skipDisabled?: boolean;
  skipReadonly?: boolean;
  skipSubmitted?: boolean;
  skipTouched?: boolean;
  skipChanged?: boolean;
  // by default, reset() events do not effect
  // linked controls (though the effect of these
  // events is shared). If you explicitely want
  // the reset event to be shared, you must pass
  // `outsideSource: true`.
  outsideSource?: boolean;
  noEmit?: boolean;
  meta?: { [key: string]: any };
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

export function composeAsyncValidators(
  validators: undefined | null | AsyncValidatorFn | AsyncValidatorFn[],
): null | AsyncValidatorFn {
  if (!validators || (Array.isArray(validators) && validators.length === 0)) {
    return null;
  }

  if (Array.isArray(validators)) {
    return async control => {
      const errors = (await Promise.all(
        validators.map(validator => validator(control)),
      )).filter(err => !!err);

      if (errors.length === 0) {
        return null;
      }

      return errors.reduce((prev, curr) => ({ ...prev, ...curr }), {});
    };
  }

  return validators;
}

/**
 * ControlSource is a special rxjs Subject which never
 * completes.
 */
export class ControlSource<T> extends Subject<T> {
  /** Complete does nothing */
  complete() {}
}

export abstract class AbstractControl<Value = any, Data = any> {
  static id = 0;

  /**
   * The ID is used to determine where StateChanges originated,
   * and to ensure that a given AbstractControl only processes
   * values one time.
   */
  id = Symbol(`Control ${AbstractControl.id}`);

  data: Data;

  /**
   * **Warning!** Do not use this property unless you know what you are doing.
   *
   * A control's `source` is the source of truth for the control. Events emitted
   * by the source are used to update the control's values. By passing events to
   * this control's source, you can programmatically control every aspect of
   * of this control.
   *
   * Never subscribe to the source directly. If you want to receive events with
   * this control, subscribe to the `changes` observable.
   */
  source = new ControlSource<StateChange<string, any>>();

  /** An observable of all changes to this AbstractControl */
  changes = this.source.pipe(
    filter(
      // make sure we don't process an event we already processed
      state =>
        !(
          (state.sources.length > 1 && state.sources[0] === this.id) ||
          state.sources.some((src, index) => index !== 0 && src === this.id)
        ),
    ),
    tap(state => this.processState(state)),
    share(),
  );

  /** An observable of value changes to this AbstractControl */
  valueChanges = this.changes.pipe(
    filter(
      ({ type, noEmit }) =>
        (type === 'setValue' || type === 'patchValue') && !noEmit,
    ),
    map(({ value }) => value),
    share(),
  );

  /** An observable of this control's value */
  values = this.valueChanges.pipe(startWith(this.value));

  protected _valueDefault: Value;
  protected _value: Value;
  get value() {
    return this._value;
  }
  /** The starting value of this form control */
  get defaultValue() {
    return this._valueDefault;
  }

  protected _errors: ValidationErrors | null = null;
  get errors() {
    return this._errors;
  }

  /**
   * A map of validation errors keyed to the source which added them.
   */
  errorsStore: ReadonlyMap<string | symbol, ValidationErrors> = new Map<
    string | symbol,
    ValidationErrors
  >();

  /** An observable of error changes to this AbstractControl */
  errorsChanges = this.changes.pipe(
    filter(({ type, noEmit }) => type === 'errors' && !noEmit),
    distinctUntilChanged((a, b) => isEqual(a.value, b.value)),
    map(({ value }) => value),
    share(),
  );

  protected _disabledDefault = false;
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

  /**
   * A map of pending states keyed to the source which added them.
   * So long as there are any `true` boolean values, this control's
   * `pending` property will be `true`.
   */
  pendingStore: ReadonlyMap<string | symbol, boolean> = new Map<
    string | symbol,
    boolean
  >();

  protected _pendingDefault = false;
  get pending() {
    return Array.from(this.pendingStore.values()).some(val => val);
  }

  get status() {
    // prettier-ignore
    return this.disabled ? 'DISABLED'
      : this.pending ? 'PENDING'
      : this.valid ? 'VALID'
      : 'INVALID';
  }

  protected _statusChanges = new Subject();
  statusChanges = this._statusChanges.pipe(
    map(() => this.status),
    distinctUntilChanged(),
    share(),
  );

  /**
   * focusChanges allows consumers to be notified when this
   * form control should be "focused". The value of emissions
   * is equal to the `meta` property passed when calling `focus()`
   * (if any).
   */
  focusChanges: Observable<
    { [key: string]: any } | undefined
  > = this.changes.pipe(
    filter(({ type, noEmit }) => type === 'focus' && !noEmit),
    map(state => state.meta),
    share(),
  );

  protected _readonlyDefault = false;
  protected _readonly = false;
  get readonly() {
    return this._readonly;
  }

  protected _submittedDefault = false;
  protected _submitted = false;
  get submitted() {
    return this._submitted;
  }

  protected _touchedDefault = false;
  protected _touched = false;
  get touched() {
    return this._touched;
  }

  protected _changedDefault = false;
  protected _changed = false;
  /** This is the same as "dirty" on standard FormControl */
  get changed() {
    return this._changed;
  }

  /** A boolean indicating if the current value is the same as the starting value */
  get isDefaultValue() {
    return this.value === this._valueDefault;
  }

  get dirty() {
    return this._touched || this._changed;
  }

  /**
   * A map of ValidatorFn keyed to the source which added them.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  validatorStore: ReadonlyMap<string | symbol, ValidatorFn> = new Map<
    string | symbol,
    ValidatorFn
  >();

  protected _validator: ValidatorFn | null = null;
  get validator() {
    return this._validator;
  }

  /**
   * A map of AsyncValidatorFn keyed to the source which added them.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  asyncValidatorStore: ReadonlyMap<string | symbol, AsyncValidatorFn> = new Map<
    string | symbol,
    AsyncValidatorFn
  >();

  protected _asyncValidator: AsyncValidatorFn | null = null;
  get asyncValidator() {
    return this._asyncValidator;
  }

  constructor(args: IAbstractControlArgs<Value, Data> = {}) {
    AbstractControl.id++;

    this.data = args.data as Data;

    // need to maintain one subscription for the
    // observable to fire and the logic to process
    this.changes.subscribe();

    this._disabledDefault = !!args.disabled;
    this.markDisabled(this._disabledDefault);
    this._readonlyDefault = !!args.readonly;
    this.markReadonly(this._readonlyDefault);
    this._pendingDefault = !!args.pending;
    this.markPending(this.id, this._pendingDefault);
    this._submittedDefault = !!args.submitted;
    this.markSubmitted(this._submittedDefault);
    this._touchedDefault = !!args.touched;
    this.markTouched(this._touchedDefault);
    this._valueDefault = args.value;
    this.setValue(this._valueDefault);
    this.setValidators(args.validators);
    this.setAsyncValidators(args.asyncValidators);
    this._changedDefault = !!args.changed;
    this.markChanged(this._changedDefault);
  }

  setValue(
    value: Value,
    options: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    } = {},
  ) {
    this.source.next({
      sources: [this.id],
      type: 'setValue',
      value,
      noEmit: options.noEmit,
      meta: options.meta,
    });
  }

  patchValue(
    value: any,
    options: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    } = {},
  ) {
    this.source.next({
      sources: [this.id],
      type: 'patchValue',
      value,
      noEmit: options.noEmit,
      meta: options.meta,
    });
  }

  markTouched(
    value: boolean,
    options: { noEmit?: boolean; meta?: { [key: string]: any } } = {},
  ) {
    if (value !== this._touched) {
      this.source.next({
        sources: [this.id],
        type: 'touched',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  markChanged(
    value: boolean,
    options: { noEmit?: boolean; meta?: { [key: string]: any } } = {},
  ) {
    if (value !== this._changed) {
      this.source.next({
        sources: [this.id],
        type: 'changed',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  markReadonly(
    value: boolean,
    options: { noEmit?: boolean; meta?: { [key: string]: any } } = {},
  ) {
    if (value !== this._readonly) {
      this.source.next({
        sources: [this.id],
        type: 'readonly',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  markSubmitted(
    value: boolean,
    options: { noEmit?: boolean; meta?: { [key: string]: any } } = {},
  ) {
    if (value !== this._submitted) {
      this.source.next({
        sources: [this.id],
        type: 'submitted',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  markPending(
    key: string | symbol,
    value: boolean,
    options: { noEmit?: boolean; meta?: { [key: string]: any } } = {},
  ) {
    if (value !== !!this.pendingStore.get(key)) {
      this.source.next({
        sources: [this.id],
        type: 'pending',
        value,
        key,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  markDisabled(
    value: boolean,
    options: { noEmit?: boolean; meta?: { [key: string]: any } } = {},
  ) {
    if (value !== this._disabled) {
      this.source.next({
        sources: [this.id],
        type: 'disabled',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }

  focus(options: { noEmit?: boolean; meta?: { [key: string]: any } } = {}) {
    this.source.next({
      sources: [this.id],
      type: 'focus',
      value: undefined,
      noEmit: options.noEmit,
      meta: options.meta,
    });
  }

  reset(options?: IAbstractControlResetOptions) {
    this.source.next({
      sources: [this.id],
      type: 'reset',
      value: options,
      noEmit: options && options.noEmit,
      meta: options && options.meta,
    });
  }

  setValidators(
    validator: ValidatorFn | ValidatorFn[] | null,
    options: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    } = {},
  ) {
    this.source.next({
      sources: [this.id],
      type: 'setValidators',
      value: validator,
      noEmit: options.noEmit,
      meta: options.meta,
    });
  }

  setAsyncValidators(
    asyncValidator: AsyncValidatorFn | AsyncValidatorFn[] | null,
    options: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    } = {},
  ) {
    this.source.next({
      sources: [this.id],
      type: 'setAsyncValidators',
      value: asyncValidator,
      noEmit: options.noEmit,
      meta: options.meta,
    });
  }

  /**
   * Returns an observable of this control's state in the form of
   * StateChange objects which can be used to make another control
   * identical to this one. This observable will complete upon
   * replaying the necessary state changes.
   */
  replayState(
    options: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    } = {},
  ) {
    const state: StateChange<string, any>[] = [
      {
        sources: [this.id],
        type: 'setValue',
        value: this.value,
        noEmit: options.noEmit,
        meta: options.meta,
      },
      {
        sources: [this.id],
        type: 'touched',
        value: this.touched,
        noEmit: options.noEmit,
        meta: options.meta,
      },
      {
        sources: [this.id],
        type: 'changed',
        value: this.changed,
        noEmit: options.noEmit,
        meta: options.meta,
      },
      {
        sources: [this.id],
        type: 'readonly',
        value: this.readonly,
        noEmit: options.noEmit,
        meta: options.meta,
      },
      {
        sources: [this.id],
        type: 'submitted',
        value: this.submitted,
        noEmit: options.noEmit,
        meta: options.meta,
      },
      {
        sources: [this.id],
        type: 'disabled',
        value: this.disabled,
        noEmit: options.noEmit,
        meta: options.meta,
      },
    ];

    for (const [key, errors] of this.errorsStore) {
      state.push({
        sources: [key],
        type: 'errors',
        value: errors,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }

    for (const [key, value] of this.pendingStore) {
      state.push({
        sources: [this.id],
        type: 'pending',
        value,
        key,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }

    for (const [key, value] of this.validatorStore) {
      state.push({
        sources: [key],
        type: 'setValidators',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }

    for (const [key, value] of this.asyncValidatorStore) {
      state.push({
        sources: [key],
        type: 'setAsyncValidators',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }

    return from(state);
  }

  protected emitStatus(options: { noEmit?: boolean }) {
    if (!options.noEmit) {
      this._statusChanges.next();
    }
  }

  protected updateValidation(options: {
    noEmit?: boolean;
    meta?: { [key: string]: any };
  }) {
    const { noEmit, meta } = options;
    const sources = [this.id];

    if (this.validator) {
      const errors = this.validator(this);

      if (errors) {
        this.source.next({
          sources,
          type: 'errors',
          value: errors,
          noEmit,
          meta,
        });

        return;
      }
    }

    if (this.asyncValidator) {
      this.markPending(this.id, true, options);

      this.asyncValidator(this).then(errors => {
        this.source.next({
          sources,
          type: 'errors',
          value: errors,
          noEmit,
          meta,
        });

        this.markPending(this.id, false, options);
      });

      return;
    }

    this.source.next({
      sources,
      type: 'errors',
      value: null,
      noEmit,
      meta,
    });
  }

  protected processState(state: StateChange<string, any>) {
    // if this StateChange didn't originate in this control,
    // then we should add this ID to the sources array to make
    // sure we don't process it again.
    if (state.sources[0] !== this.id) {
      state.sources = [...state.sources, this.id];
    }

    switch (state.type) {
      case 'setValue':
      case 'patchValue': {
        this._value = state.value;
        this.updateValidation(state);

        return true;
      }
      case 'errors': {
        if (!state.value) {
          (this.errorsStore as Map<string | symbol, ValidationErrors>).delete(
            state.sources[0],
          );
        } else {
          (this.errorsStore as Map<string | symbol, ValidationErrors>).set(
            state.sources[0],
            state.value,
          );
        }

        this._errors = Array.from(this.errorsStore.values()).reduce(
          (prev, curr) => {
            if (!curr) {
              return prev;
            }
            if (!prev) {
              return curr;
            }
            return { ...prev, ...curr };
          },
          null,
        ) as ValidationErrors | null;

        this.emitStatus(state);
        return true;
      }
      case 'submitted': {
        this._submitted = state.value;
        return true;
      }
      case 'touched': {
        this._touched = state.value;
        return true;
      }
      case 'changed': {
        this._changed = state.value;
        return true;
      }
      case 'readonly': {
        this._readonly = state.value;
        return true;
      }
      case 'disabled': {
        this._disabled = state.value;
        this.emitStatus(state);
        return true;
      }
      case 'pending': {
        if (state.value) {
          (this.pendingStore as Map<string | symbol, boolean>).set(
            state.key,
            state.value,
          );
        } else {
          (this.pendingStore as Map<string | symbol, boolean>).delete(
            state.key,
          );
        }

        this.emitStatus(state);
        return true;
      }
      case 'reset': {
        /**
         * In general, if a user links two controls together, it is assumed that they
         * *do not* actually want `reset()` events to be shared (they just want the
         * *effects* of the `reset()` shared).
         *
         * This is because `reset()` would have a different effect on each control
         * unless they had the same starting values. If someone truely does want a
         * `reset()` event to cascade, they must pass the `outsideSource: true` option.
         */

        if (state.sources[0] !== this.id && !state.outsideSource) return true;

        const reset = (state.value as IAbstractControlResetOptions) || {};

        if (!reset.skipValue) {
          this.setValue(this._valueDefault, state);
        }

        if (!reset.skipTouched) {
          this.markTouched(this._touchedDefault, state);
        }

        if (!reset.skipSubmitted) {
          this.markSubmitted(this._submittedDefault, state);
        }

        if (!reset.skipDisabled) {
          this.markDisabled(this._disabledDefault, state);
        }

        if (!reset.skipChanged) {
          this.markChanged(this._changedDefault, state);
        }

        return true;
      }
      case 'setValidators': {
        if (state.value) {
          (this.validatorStore as Map<string | symbol, ValidatorFn>).set(
            state.sources[0],
            composeValidators(state.value),
          );
        } else {
          (this.validatorStore as Map<string | symbol, ValidatorFn>).delete(
            state.sources[0],
          );
        }

        this._validator = composeValidators(
          Array.from(this.validatorStore.values()),
        );

        this.updateValidation(state);
        return true;
      }
      case 'setAsyncValidators': {
        if (state.value) {
          (this.validatorStore as Map<string | symbol, AsyncValidatorFn>).set(
            state.sources[0],
            composeAsyncValidators(state.value),
          );
        } else {
          (this.validatorStore as Map<
            string | symbol,
            AsyncValidatorFn
          >).delete(state.sources[0]);
        }

        this._asyncValidator = composeAsyncValidators(
          Array.from(this.asyncValidatorStore.values()),
        );

        this.updateValidation(state);
        return true;
      }
    }

    return false;
  }
}
