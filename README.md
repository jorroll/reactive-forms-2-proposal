# This is a proposal to improve `@angular/forms`

For an overview of this proposal, and to provide most feedback, head over to the associated angular issue: https://github.com/angular/angular/issues/31963.

You can demo this proposal on stackblitz: https://stackblitz.com/github/thefliik/reactive-forms-2-proposal.

The focus of this repo is on the API design, **_not_** this specific implementation. For example, this implementation has a dependency on lodash, a version included in Angular/forms would not want this dependency.

If you like this proposal, and wish to update it, feel free to make PRs against this repo. Most discussion of the merits of this proposal would be better left in the associated angular issue.

This proposal is published on npm as `reactive-forms-module2-proposal`. This is an experimental module that is _not suitable for production_.

## StateChange API

_Note: only *advanced users* of the AbstractControl API need to know about the StateChange API. Most users can simply use the methods provided on AbstractControl to accomplish everything (and don't even need to know the StateChange API is being used internally to accomplish tasks)._

At the core of this AbstractControl proposal is a new StateChange API which controls all mutations (state changes) to the AbstractControl. It is powered by two properties on the AbstractControl: `source: ControlSource<StateChange<string, any>>` and `changes: Observable<StateChange<string, any>>` (where `ControlSource` is simply a modified rxjs `Subject`).

To change the state of an AbstractControl, you emit a new StateChange object from the `source` property. This object has the interface

_Figure 1:_

```ts
interface StateChange<T extends string, V> {
  source: ControlId;
  readonly applied: ControlId[];
  type: Type;
  value: Value;
  noEmit?: boolean;
  meta?: { [key: string]: any };
  [key: string]: any;
}

type ControlId = string | symbol;
```

When you call a method like `AbstractControl#markTouched()`, that method simply constructs the appropriate StateChange object for you and emits that object from `sources`.

_Figure 2:_

```ts
abstract class AbstractControl<V = any, D = any> {
  id: symbol;

  markTouched(value: boolean, options: StateChangeOptions = {}) {
    if (value !== this._touched) {
      this.source.next({
        source: source || this.id,
        applied: [],
        type: 'touched',
        value,
        noEmit: options.noEmit,
        meta: options.meta,
      });
    }
  }
}
```

Internally, the AbstractControl subscribes to output from the `ControlSource` (`source` property) and pipes that output to a `protected processState()` method. After being processed, the StateChange object is then re-emitted from the `changes` property (so when a subscriber receives a StateChange from the `changes` property, that change has already been applied to the AbstractControl).

_Figure 3:_

```ts
abstract class AbstractControl<V = any, D = any> {
  id: symbol;

  changes = this.source.pipe(
    filter(
      // make sure we don't process an event we already processed
      state => !state.applied.includes(this.id),
    ),
    tap(state => {
      // Add our ID to the `applied` array to indicate that this control
      // has already processed this state change and doesn't need to
      // do so again.
      //
      // It's important that we `push()` the new change in to keep the same
      // array reference
      state.applied.push(this.id);

      this.processState(state);
    }),
    share(),
  );
}
```

You'll notice that only state changes that haven't yet been applied to this `AbstractControl` are processed (i.e. `!state.applied.includes(this.id)`). This allows two AbstractControls to subscribe to each other's changes without entering into an infinite loop.

### Extensibility

This StateChange API is highly extensible. At any time, a user can emit a custom state change using the `AbstractControl#stateChange()` method. A custom state change will have no meaning to the AbstractControl itself, but it will be emitted from the `changes` observable and the user can act on the state change as appropriate. Similarly, if you actually create a custom AbstractControl (or extend an existing abstract control), you can simply define new state changes and add in custom logic to process them.

StateChanges can also be used to emit events (rather than an actual _state change_). For example, the current `FormControlDirective` emits a custom `{type: "ControlAccessor", value: 'PreInit" | "PostInit" | "Cleanup"}` state change to allow hooking into the `FormControlDirective's` lifecycle.

### View the API of individual StateChanges

At the moment, the place to view all the different predefined state changes is in the source code. The `protected processState()` method is responsible for processing all state changes. Eventually, it would be important to document the interface of different state changes.

- [view source code](./libs/reactive-forms-module2-proposal/src/lib/models/control-base.ts#L977)

## ControlAccessor API

This proposal can easily be made compatible with the current `ControlValueAccessor` API. This being said, this proposal enables the following new, simpler and more powerful `ControlAccessor` interface:

```ts
interface ControlAccessor<T extends AbstractControl = AbstractControl> {
  readonly control: T;
}

interface ControlContainerAccessor<
  T extends ControlContainer = ControlContainer
> extends ControlAccessor<T> {}
```

This new `ControlAccessor` interface can be seen in action in this repo's `directives` folder (e.g. `NgFormControlDirective`). The new interface greatly simplifies the process of implementing a `ControlAccessor` -- all you need to do is add a `control` property containing an abstract control.

For example:

```ts
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
  providers: [
    {
      provide: NG_CONTROL_ACCESSOR,
      useExisting: forwardRef(() => ExampleComponent),
      multi: true,
    },
  ],
})
export class ExampleComponent implements ControlAccessor {
  readonly control = new FormControl<Date | null>(null);
}
```

If you want to mark the control accessor as touched, simply `control.markTouched(true)`. If you want to update the value of the control, simply `control.patchValue(new Date())`. If you wish to subscribe to value changes of a `ControlAccessor`, simply grab the `control` property and subscribe to value changes `control.observeChanges('value')`. Because of the easy ability to sync controls in the new state change API, you can link your form control to a `ControlAccessor` via:

```ts
@Component({
  selector: 'app-example',
  templateUrl: './example.component.html',
  styleUrls: ['./example.component.scss'],
})
export class ExampleComponent {
  readonly control = new FormControl('Angular');
  readonly accessor: ControlAccessor;

  private subscriptions: Subscription[] = [];

  constructor(
    @Self()
    @Inject(NG_CONTROL_ACCESSOR)
    accessors: ControlAccessor[],
  ) {
    this.accessor = resolveControlAccessor(accessors);
  }

  ngOnInit() {
    this.subscriptions.push(
      // here we set the accessor state to be identical to our
      // control's state
      this.control
        .replayState({ includeDefaults: true })
        .subscribe(this.accessor.control.source),
      // then we subscribe the accessor to changes in our control state
      this.control.changes.subscribe(this.accessor.control.source),
      // we also subscribe our control to changes in the accessor start
      this.accessor.control.changes.subscribe(this.control.source),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
```

This way, any changes to the `ExampleComponent's` control are reflected in the linked accessor, and any changes to the linked accessor's control are reflected in the `ExampleComponent's` control. Also note, the `ExampleComponent` is a valid ControlAccessor itself!.

### Creating a `ControlContainerAccessor`

The new `ControlAccessor` API also allows for ControlAccessors which contain a `ControlContainer` such as a `FormGroup` or `FormArray`. For example, you could choose to create a `<people-form-component>` component which implements `ControlContainerAccessor<FormArray>`:

```ts
@Component({
  selector: 'app-people-form',
  templateUrl: './people-form.component.html',
  styleUrls: ['./people-form.component.scss'],
})
export class PeopleFormComponent implements ControlContainerAccessor {
  readonly control = new FormArray<
    Array<
      FormGroup<{
        id: FormControl<String>;
        name: FormControl<string>;
      }>
    >
  >();

  private subscriptions: Subscription[] = [];

  ngOnInit() {
    this.subscriptions.push(
      this.control.changes
        .pipe(
          // The FormControlDirective's API gives us a few lifecycle hooks.
          // Here, after this ControlAccessor has been linked to another control via a
          // FormControlDirective, we finish initialization by adding in two default
          // FormGroups
          filter(
            ({ type, value }) =>
              type === 'ControlAccessor' && value === 'PostInit',
          ),
        )
        .subscribe(() => {
          this.control.addControl(
            new FormGroup({
              id: new FormControl(1),
              name: new FormControl('Angular'),
            }),
          );
          this.control.addControl(
            new FormGroup({
              id: new FormControl(3),
              name: new FormControl('ReactiveForms'),
            }),
          );
        }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
```

## AbstractControl API

The StateChange API enables some cool features. A few of which I'll highlight here (also check out the examples demonstration on stackblitz):

### Async Validation

The state change API makes subscribing to changes and adding errors super easy (shown in Example Four of the stackblitz demo):

```ts
class ExampleFourComponent implements OnInit {
  usernameControl = new FormControl('');

  constructor(
    // using Inject here for stackblitz compatibility
    @Inject(UserService)
    private userService: UserService,
  ) {}

  ngOnInit() {
    this.usernameControl
      // we subscribe to value changes of the `usernameControl`, specifying that
      // we want to receive changes even if the user has specified the "noEmit"
      // option for the changes
      .observeChanges('value', { ignoreNoEmit: true })
      .pipe(
        tap(() =>
          // When a change comes in, we mark the `usernameControl` as pending.
          // We optionally specify the pending source as the `"userService"`.
          // This means that if another source specifies `markPending(false)`,
          // our control will still be considered pending until this service's
          // pending call is also false.
          this.usernameControl.markPending(true, { source: 'userService' }),
        ),
        debounceTime(500),
        // preform our validation using the external service.
        switchMap(value => this.userService.doesNameExist(value)),
        tap(() =>
          // mark our control as no longer pending
          this.usernameControl.markPending(false, { source: 'userService' }),
        ),
      )
      .subscribe(response => {
        const errors = response.payload ? { userNameExists: true } : null;

        // update our usernameControl's errors property with either `null` or the
        // relevant errors. Like the call to `markPending`, we can specify the
        // source of these errors so that another service setting `null` errors
        // will not erase *this services* errors.
        //
        // A control has errors so long as any source has added errors.
        this.usernameControl.setErrors(errors, {
          source: 'userService',
        });
      });
  }
}
```

An earlier version of this proposal included an `asyncValidators` property on `AbstractControl` (similar to the current `ReactiveFormsModule`). This property only existed to increase the similarities between the new API and the old API. I decided to remove the `asyncValidators` property in favor of using external services which provide more user control.

### `observe()`

You can `observe()`/`observeChanges()` on any property. Because we know when any properties change, we can easily subscribe to anything via `control.observe('value')` or `control.observe('errors')` etc. The `observe()` method immediately returns the current value, as well as subscribes to all changes. If we just want changes to a property, we can use `control.observeChanges('value')` etc.

Things get even cooler when you use these methods on a `ControlContainer` such as a `FormGroup`. With a form group, we can observe child properties. For example, `formGroup.observeChanges('controls', 'name', 'value')` will subscribe to the value changes of the form groups `"name"` control. If the `"name"` control is removed from the form group, the subscription will emit `undefined`. If the `"name"` control is replaced by a new name control with the same value, our subscription will not re-emit.

We can also drill down even farther. Take the following form group as an example:

```ts
const innerFormGroup = new FormGroup({
  id: new FormControl(1),
  name: new FormControl('John'),
});

const formGroup = new FormGroup({
  people: new FormArray([innerFormGroup]),
});

formGroup
  .observeChanges('controls', 'people', 'controls', 0, 'controls')
  .subscribe(controls => {
    // ... do stuff
  });
```

Here, we are subscribing to changes to the controls of `innerFormGroup`. Also not that this method call has full type safety. i.e. the `controls` value we are subscribing to has the type:

```ts
{ id: FormControl<number>; name: FormControl<string> }
```
