# This is a proposal to improve `@angular/forms`

You can demo this proposal on stackblitz: https://stackblitz.com/github/thefliik/reactive-forms-2-proposal.

The focus of this repo is on the API design, **_not_** this specific implementation. For example, this implementation has a dependency on lodash, a version included in Angular/forms would not want this dependency.

If you like this proposal, and wish to update it, feel free to make PRs against this repo. Most discussion of the merits of this proposal would be better left in the associated angular issue.

### Description

The ReactiveFormsModule is pretty good, but it has a number of problems.

1. The module is not strongly typed
   - See issues #13721 #27389 #27665 #25824 #20040 #17000 #16999 #16933 relating to controls
   - See issues #31801 #19340 #19329 relating to ControlValueAccessor
2. It’s relatively complicated to display error messages, given how fundamental this task is. See #25824 #24981 #22319 #21011 #2240 #9121 #18114
3. The methods for adding errors are inflexible. It is not possible to add arbitrary errors. It is difficult to interface with async services to display errors (hence the need for different update strategies like on `blur` / on `submit`). In general, working with errors is more difficult than it should be.
   - See #31105 #29275 #26683 #23484 #20371 #17090 #13920 #9119 #6895 #19851 #18871 #10530 #6170.
4. Numerous annoyances with unfortunate API decisions.
   - You can't bind a single form control to multiple inputs without ControlValueAccessor #14451
   - Can't store arbitrary metadata on a control #19686
   - Calling `reset()` doesn't actually reset the control to its initial value #20214 #19747 #15741 #19251
   - Must call `markAsTouched()` / `markAsUntouched()` instead of simply `markTouched(boolean)`, which is more programmatically friendly #23414 #23336
   - Creating custom form components is relatively complex #12248
   - etc. #11447 #12715 #10468 #10195 #31133
5. In addition to all the issues dealing with errors (`#3` above), the API does not offer low level programmatic control and can be frustratingly not extensible.
   - See issues #3009 #20230 related to parsing/formatting user input
   - See issues #31046 #24444 #10887 #30610 relating to touched/dirty/etc flag changes
   - See issues #30486 #31070 #21823 relating to the lack of ng-submitted change tracking
   - Ability to remove FormGroup control without emitting event #29662
   - Ability to subscribe to FormGroup form control additions / removals #16756
   - Ability to mark ControlValueAccessor as untouched #27315
   - Provide ControlValueAccessors for libraries other than `@angular/forms` #27672

### Describe the solution you'd like

Fundamentally, the existing `AbstractControl` class does not offer the extensibility / ease of use that such an important object should have. This is a proposal to re-think the design of `AbstractControl` for inclusion in an eventual `ReactiveFormsModule2`. In general, it addresses points 1, 3, 4, and 5, above.

- Code for this proposal can be found in [this github repo](https://github.com/thefliik/reactive-forms-2-proposal).
- This proposal is demostrated in [this Stackblitz project](https://stackblitz.com/github/thefliik/reactive-forms-2-proposal).
  - The demo also contains an example compatibility directive, letting the new `AbstractControl` be used with existing angular material components.
- The [proposed interface](#the-interface) is shown below.

### Overview:

The new `AbstractControl` class has a `source: ControlSource<StateChange<string, any>>` property which is the source of truth for all operations on the AbstractControl. The `ControlSource` is just a modified rxjs `Subject`. Internally, output from `source` is piped to the `changes` observable, which performs any necessary actions to determine the new `AbstractControl` state before emitting the `StateChange<string, any>` object again. This means that subscribing to the `changes` observable will get you all changes to the `AbstractControl`.

Below are a few somewhat advanced examples of the benefits / flexibility of this new API (there are additional examples on stackblitz). These examples also specifically focus on things the existing API cannot do. Because `AbstractControl` is abstract (and cannot be instantiated), these example use a simple `FormControl` object that looks like so:

```ts
class FormControl<Value = any, Data = any> extends AbstractControl<
  Value,
  Data
> {}
```

#### Example 1: linking one FormControl to another FormControl

Here, by subscribing the source of `controlB` to the changes of `controlA`, `controlB` will reflect all changes to `controlA`.

```ts
const controlA = new FormControl();
const controlB = new FormControl();

controlA.changes.subscribe(controlB.source);
```

Multiple form controls can also be linked to each other, meaning that all changes to one will be applied to the others. Because changes are keyed to source ids, this does not cause an infinite loop (as can be seen in the stackblitz example).

```ts
controlA.changes.subscribe(controlB.source);
controlB.changes.subscribe(controlA.source);
controlC.changes.subscribe(controlA.source);
controlA.changes.subscribe(controlC.source);
```

#### Example 2: dynamically parse a control's text input

Here, a user is providing text date values and we want a control with javascript `Date` objects. Importantly, the `dateControl` in the example below shares all the `touched`, `changed`, `invalid`, `errors`, etc, state with the `inputControl`.

```ts
// regex from https://stackoverflow.com/a/15504877/5490505
const dateRegex = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;

const dateValidatorFn: ValidatorFn = control => {
  if (dateRegex.test(control.value)) {
    return null;
  }

  return {
    invalidDate: 'Invalid date format! Try M/D/YY or M/D/YYYY',
  };
};

this.inputControl = new FormControl({
  value: '',
  validators: dateValidatorFn,
});

this.dateControl = new FormControl<Date | null>({ value: null });

this.inputControl.changes
  .pipe(
    map(state => {
      switch (state.type) {
        case 'setValue':
        case 'patchValue':
          return {
            ...state,
            value: dateRegex.test(state.value) ? new Date(state.value) : null,
          };
        default:
          return state;
      }
    }),
  )
  .subscribe(this.dateControl.source);

// To simplify things, we are linking all changes to dateControl back to inputControl
// EXCEPT for value changes to dateControl. We could also link value changes, but then
// the example gets more complex.
this.dateControl.changes
  .pipe(filter(state => !['setValue', 'patchValue'].includes(state.type)))
  .subscribe(this.inputControl.source);
```

#### Example 3: validating the value of an AbstractControl via a service

Here, a `usernameControl` is receiving text value from a user and we want to validate that with an external service (e.g. "does the username already exist?").

```ts
const usernameControl = new FormControl();

usernameControl.valueChanges
  .pipe(
    tap(() => this.usernameControl.markPending('userService', true)),
    debounceTime(500),
    switchMap(value => this.userService.doesNameExist(value)),
    tap(() => this.usernameControl.markPending('userService', false)),
    map(response => ({
      sources: ['MyUserService'],
      type: 'errors',
      value: response.payload ? { userNameExists: true } : null,
    })),
  )
  .subscribe(this.usernameControl.source);
```

Some things to note in this example:

1. The API allows users to associate a call to `markPending()` with a specific key (in this case "userService"). This way, calling `markPending(false)` elsewhere (e.g. a different service validation call) will not prematurely mark _this_ service call as no-longer-pending. The AbstractControl is pending so long as any `key` is true.
2. Internally, errors are stored associated with a source. In this case, the source is `'MyUserService'`. If this service adds an error, but another service later says there are no errors, that service will not accidently overwrite this service's error.
   1. Importantly, the `errorsChanges` observable combines all errors into one object.
3. The API could allow for arbitrary `addError()`/`removeError()` methods on AbstractControl, but I decided not to add those methods because you would need to understand the `StateChange` api to use those methods confidently. Users who understand the stateChange api can simply call `control.source.next()` to add/remove an error.

#### Example 4: using dependency injection to dynamically add new validator functions to a control

In the _existing_ `ReactiveFormsModule`, when you pass a control to a `FormControlDirective` via `[formControl]`, that directive may dynamically add validator functions to the control. It does this by creating a new validator function which combines the control's existing validator function(s) with any additional validator functions the `FormControlDirective` has had injected. It then replaces the control's existing validator function with the new one. This process is complex and can lead to bugs. For example, after this process is complete there isn't any way to determine which validator functions were added by the user vs which ones were added dynamically.

Here, validators are internally stored keyed to a source id (similar to errors). If a FormControl is passed to a directive which dymanically injects additional validator functions, those functions will be stored separately from the FormControl's other functions (and are deleted separately). This leads to more consistent, predictable behavior that an unknowledgable user cannot mess with.

```ts
@Directive({
  selector: 'myControlDirective',
})
class MyControlDirective {
  static id = 0;

  @Input('myControlDirective') control: AbstractControl;

  private id = Symbol(`myControlDirective ${MyControlDirective.id}`);

  constructor(
    @Optional()
    @Self()
    @Inject(NG_VALIDATORS_2)
    private validators: ValidatorFn[] | null,
    @Optional()
    @Self()
    @Inject(NG_ASYNC_VALIDATORS_2)
    private asyncValidators: AsyncValidatorFn[] | null,
  ) {
    MyControlDirective.id++;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.control.previousValue) {
      // clear injected validators from the old control
      const oldControl = changes.control.previousValue;

      oldControl.source.next({
        sources: [this.id],
        type: 'setValidators',
        value: null,
      });

      oldControl.source.next({
        sources: [this.id],
        type: 'setAsyncValidators',
        value: null,
      });
    }

    // add injected validators to the new control
    this.control.source.next({
      sources: [this.id],
      type: 'setValidators',
      value: this.validators,
    });

    this.control.source.next({
      sources: [this.id],
      type: 'setAsyncValidators',
      value: this.asyncValidators,
    });
  }
}
```

### The interface

```ts
abstract class AbstractControl<Value = any, Data = any> {
  id: symbol;
  data: Data;

  /**
   * This property is where all the magic happens.
   */
  source: ControlSource<StateChange<string, any>>;
  changes: Observable<StateChange<string, any>>;

  /** An observable of value changes to this AbstractControl */
  valueChanges: Observable<Value>;
  /** An observable of this control's value */
  values: Observable<Value>;
  value: Value;
  defaultValue: Value;
  isDefaultValue: boolean;

  errors: ValidationErrors | null;
  errorsChanges: Observable<ValidationErrors | null>;

  /**
   * A map of validation errors keyed to the source which added them.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  errorsStore: ReadonlyMap<string | symbol, ValidationErrors>;

  status: 'DISABLED' | 'PENDING' | 'VALID' | 'INVALID';
  statusChanges: Observable<'DISABLED' | 'PENDING' | 'VALID' | 'INVALID'>;

  /**
   * Emits focus events intended to signal that the `input` associated
   * with a FormControl should receive focuse in the browser.
   */
  focusChanges: Observable<{ [key: string]: any } | undefined>;

  disabled: boolean;
  valid: boolean;
  invalid: boolean;

  /**
   * A map of pending states keyed to the source which added them.
   * So long as there are any `true` boolean values, this control's
   * `pending` property will be `true`.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  pendingStore: ReadonlyMap<string | symbol, boolean>;
  pending: boolean;

  readonly: boolean;
  submitted: boolean;
  touched: boolean;
  /**
   * A note on `changed` vs `dirty`
   *
   * `changed` indicates if the control's value has changed since
   * the control was created. This is the same as `dirty` in the
   * ReactiveFormsModule.
   *
   * `dirty` indicates if the control's value is either `touched`
   * OR `changed`, which is different than in the ReactiveFormsModule.
   *
   * If this proves confusing, `dirty` could be eliminated from the
   * first release of `ReactiveFormsModule2`, only to be added back
   * in at a future date when people have adjusted to the new
   * module.
   */
  changed: boolean;
  dirty: boolean;

  /**
   * A map of ValidatorFn keyed to the source which added them.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  validatorStore: ReadonlyMap<string | symbol, ValidatorFn>;
  validator: ValidatorFn | null;

  /**
   * A map of AsyncValidatorFn keyed to the source which added them.
   *
   * In general, users won't need to access this. But it is exposed for
   * advanced usage.
   */
  asyncValidatorStore: ReadonlyMap<string | symbol, AsyncValidatorFn>;
  asyncValidator: AsyncValidatorFn | null;

  constructor(args?: IAbstractControlArgs<Value, Data>)

  // Like in the ReactiveFormsModule,
  // `setValue` and `patchValue` are, be default, the same.
  // They can be overwritten by a class extending AbstractControl
  // to be made different

  setValue(
    value: Value,
    options?: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    },
  ): void;

  patchValue(
    value: any,
    options?: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    },
  ): void;

  markTouched(
    value: boolean,
    options?: { noEmit?: boolean; meta?: { [key: string]: any } },
  ): void;

  markChanged(
    value: boolean,
    options?: { noEmit?: boolean; meta?: { [key: string]: any } },
  ): void;

  markReadonly(
    value: boolean,
    options?: { noEmit?: boolean; meta?: { [key: string]: any } },
  ): void;

  markSubmitted(
    value: boolean,
    options?: { noEmit?: boolean; meta?: { [key: string]: any } },
  ): void;

  markPending(
    key: string | symbol,
    value: boolean,
    options?: { noEmit?: boolean; meta?: { [key: string]: any } },
  ): void;

  markDisabled(
    value: boolean,
    options?: { noEmit?: boolean; meta?: { [key: string]: any } },
  ): void;

  setValidators(
    validator: ValidatorFn | ValidatorFn[] | null,
    options?: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    },
  ): void;

  setAsyncValidators(
    asyncValidator: AsyncValidatorFn | AsyncValidatorFn[] | null,
    options?: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    },
  ): void;

  focus(
    options?: { noEmit?: boolean; meta?: { [key: string]: any } },
  ): void;

  reset(options?: IAbstractControlResetOptions }): void;

  /**
   * Returns an observable of this control's state in the form of
   * StateChange objects which can be used to make another control
   * identical to this one. This observable will complete upon
   * replaying the necessary state changes.
   */
  replayState(
    options?: {
      noEmit?: boolean;
      meta?: { [key: string]: any };
    }
  ): Observable<StateChange<string, any>>;

  /**
   * This method can be overridden in classes like FormGroup to support retrieving child
   * abstract controls.
   *
   * In general, I imagine the process of actually building out this new ReactiveFormsModule2
   * will result in various convenience methods added to AbstractControl (such as `parent`). For
   * now, my focus has been on the basic design.
   */
  get(path: string): AbstractControl | null;
}

interface StateChange<T extends string, V> {
  sources: (symbol | string)[];
  type: T;
  value: V;
  noEmit?: boolean;
  meta?: { [key: string]: any };
  [key: string]: any;
}

interface IAbstractControlArgs<V = any, D = any> {
  value?: V;
  data?: D;
  validators?: ValidatorFn | ValidatorFn[] | null;
  asyncValidators?: AsyncValidatorFn | AsyncValidatorFn[] | null;
  disabled?: boolean;
  readonly?: boolean;
  pending?: boolean;
  submitted?: boolean;
  touched?: boolean;
  changed?: boolean;
}

interface IAbstractControlResetOptions {
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
```

### Wrapping up

There's a lot packed in to this API update. For a full overview, you should [check out the repo](https://github.com/thefliik/reactive-forms-2-proposal).

Two other details to note:

1. When you pass the `noEmit` option to a function, that squelches emissions from `valueChanges`, `values`, `errorsChanges`, and `statusChanges`, but it does not effect the `changes` observable. This is a good thing. It means that library authors can hook into the pure stream of state changes on an AbstractControl and choose to honor or ignore `noEmit` as approriate (via an observable operator like `filter()`).
2. All methods that will emit offer a `meta` option that accepts an arbitrary metadata object that will be included in the state change object. This greatly increases customizability / extensibility, as you can attach custom information to any action and access that custom information on the StateChange objects.

### Things not included in this proposal

A lot of the issues with the current FormControl API are ultimately issues with the current `ValidatorFn` / `ValidationErrors` API.

Examples include:

1. If a control is required, a `[required]` attribute is not automatically added to the appropriate element in the DOM.
   1. Similarly, other validators should also include DOM changes (e.g. a maxLength validator should add a `[maxlength]` attribute for accessibility, there are ARIA attributes which should be added for accessibility, etc).
   2. If you validate to make sure an input is a `number`, it's appropriate to add a `type="number"` attribute on the underlying `<input>`.
2. Generating and displaying error messages is much harder than it should be, for such a fundamental part a Forms API.

Ultimately, I see these as failings of the current `ValidatorFn` / `ValidationErrors` API, and should be addressed in a fix to that API. Any such fix should be included in any `ReactiveFormsModule2`, but they should be discussed in a separate issue.

Personally, I came up with a pretty simple update to the validator API to fix those issues (which, if accepted, will change this proposal), but I've decided to only focus on the AbstractControl API in this issue to help focus the discussion. If this proposal (or a form of it) is accepted, I'll follow up by sharing a `Validator` proposal which will compliment and modestly change this new AbstractControl API.

Additionally, this proposal does not touch ControlValueAccessor. This decision was again made to focus discussion on AbstractControl. This being said, this API would allow for the `ControlValueAccessor` interface to be changed to simply:

```ts
interface ControlValueAccessor<T = any> {
  control: AbstractControl<T>;
}
```

_you can see an example of this [in the repo](https://github.com/thefliik/reactive-forms-2-proposal/blob/master/src/app/reactive-forms-two/directives/form_control_directive.ts)_

This would make implementing the interface easier, and would offer more power and flexibility to users. For instance, it opens up the ability for an "address" ControlValueAccessor to link directly to a FormGroup.

### Describe alternatives you've considered

While fixing the existing `ReactiveFormsModule` is a possibility, it would involve many breaking changes. As `Renderer` -> `Renderer2` has shown, a more user friendly solution is to create a new `ReactiveFormsModule2` module, depricate the old module, and provide a compatibility layer to allow usage of the two side-by-side.
