# This is a proposal to improve `@angular/forms`

For an overview of this proposal, and to provide most feedback, head over to the associated angular issue: https://github.com/angular/angular/issues/31963.

You can demo this proposal on stackblitz: https://stackblitz.com/github/thefliik/reactive-forms-2-proposal.

The focus of this repo is on the API design, **_not_** this specific implementation. For example, this implementation has a dependency on lodash, a version included in Angular/forms would not want this dependency.

If you like this proposal, and wish to update it, feel free to make PRs against this repo. Most discussion of the merits of this proposal would be better left in the associated angular issue.

## StateChange API

_Note: only *advanced users* of the AbstractControl API need to know about the StateChange API. Most users can simply use the methods provided on AbstractControl to accomplish everything (and don't even need to know the StateChange API is being used internally to accomplish tasks)._

At the core of this AbstractControl proposal is a new StateChange API which controls all mutations (state changes) to the AbstractControl. It is powered by two properties on the AbstractControl: `source: ControlSource<StateChange<string, any>>` and `changes: Observable<StateChange<string, any>>` (where `ControlSource` is simply a modified rxjs `Subject`).

To change the state of an AbstractControl, you emit a new StateChange object from the `source` property. This object has the interface

*Figure 1:*

```ts
interface StateChange<T extends string, V> {
  sources: Array<symbol | string>;
  type: T;
  value: V;
  noEmit?: boolean;
  meta?: { [key: string]: any };
  [key: string]: any;
}
```

When you call a method like `AbstractControl#markTouched()`, that method simply constructs the appropriate StateChange object for you and emits that object from `sources`.

*Figure 2:*

```ts
abstract class AbstractControl<V=any, D=any> {
  id: symbol;
  
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
}
```

Internally, the AbstractControl subscribes to output from the `ControlSource` (`source` property) and pipes that output to a `protected processState()` method. After being processed, the StateChange object is then re-emitted from the `changes` property (so when a subscriber receives a StateChange from the `changes` property, that change has already been applied to the AbstractControl).

*Figure 3:*

```ts
abstract class AbstractControl<V=any, D=any> {
  id: symbol;
  
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
}
```

The first thing that the `processState()` method will do is look at the `sources` property of the StateChange, if the first element in the sources array is NOT the `id` of the AbstractControl, then this means that the StateChange originated from "something" else. That "something" could be another form control, it could be a service, a directive, etc. If the StateChange did not originate from the AbstractControl, then the first thing `processState()` does is modify the StateChange to add its `id` to end the `sources` array (indicating that this StateChange has already been processed by the AbstractControl). It then handles any necessary mutations to the form control based on the `StateChange#type`.

If we look back at *figure 3*, we can see that StateChange objects which have already been processed by an AbstractControl are filtered out and not re-processed. This allows two AbstractControls to subscribe to each other's changes without entering into an infinite loop.
