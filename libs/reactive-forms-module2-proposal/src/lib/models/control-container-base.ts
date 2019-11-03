import { Subscription, concat, Observable, of } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import {
  AbstractControl,
  ControlEventOptions,
  DeepReadonly,
  ControlEvent,
  ControlId,
} from './abstract-control';
import { ControlContainer } from './control-container';
import { ControlBase, StateChange } from './control-base';
import { isTruthy, capitalize } from './util';

export abstract class ControlContainerBase<Controls, Value, EnabledValue, Data>
  extends ControlBase<Value, Data>
  implements ControlContainer<Controls, Value, EnabledValue, Data> {
  abstract readonly controlsStore: ReadonlyMap<any, AbstractControl>;

  protected abstract _controls: Controls;
  get controls() {
    return this._controls;
  }

  protected _size!: number;
  get size() {
    return this._size;
  }

  protected _value!: Value;
  get value() {
    return this._value as DeepReadonly<Value>;
  }

  protected _enabledValue!: EnabledValue;
  get enabledValue() {
    return this._enabledValue as DeepReadonly<EnabledValue>;
  }

  // VALID / INVALID

  get invalid() {
    return this.containerInvalid || this.childInvalid;
  }
  get valid() {
    return !this.invalid;
  }

  get containerInvalid() {
    return !!this.errors;
  }
  get containerValid() {
    return !this.errors;
  }

  protected _childInvalid = false;
  get childInvalid() {
    return this._childInvalid;
  }

  protected _childrenInvalid = false;
  get childrenInvalid() {
    return this._childrenInvalid;
  }

  get childValid() {
    return !this.childrenInvalid;
  }

  get childrenValid() {
    return !this.childInvalid;
  }

  // DISABLED

  get disabled() {
    return this.containerDisabled || this.childrenDisabled;
  }

  get containerDisabled() {
    return this._disabled;
  }

  protected _childDisabled = false;
  get childDisabled() {
    return this._childDisabled;
  }

  protected _childrenDisabled = false;
  get childrenDisabled() {
    return this._childrenDisabled;
  }

  // READONLY

  get readonly() {
    return this.containerReadonly || this.childrenReadonly;
  }

  get containerReadonly() {
    return this._readonly;
  }

  protected _childReadonly = false;
  get childReadonly() {
    return this._childReadonly;
  }

  protected _childrenReadonly = false;
  get childrenReadonly() {
    return this._childrenReadonly;
  }

  // SUBMITTED

  get submitted() {
    return this.containerSubmitted || this.childrenSubmitted;
  }

  get containerSubmitted() {
    return this._submitted;
  }

  protected _childSubmitted = false;
  get childSubmitted() {
    return this._childSubmitted;
  }

  protected _childrenSubmitted = false;
  get childrenSubmitted() {
    return this._childrenSubmitted;
  }

  // TOUCHED

  get touched() {
    return this.containerTouched || this.childTouched;
  }

  get containerTouched() {
    return this._touched;
  }

  protected _childTouched = false;
  get childTouched() {
    return this._childTouched;
  }

  protected _childrenTouched = false;
  get childrenTouched() {
    return this._childrenTouched;
  }

  // CHANGED

  get changed() {
    return this.containerChanged || this.childChanged;
  }

  get containerChanged() {
    return this._changed;
  }

  protected _childChanged = false;
  get childChanged() {
    return this._childChanged;
  }

  protected _childrenChanged = false;
  get childrenChanged() {
    return this._childrenChanged;
  }

  // PENDING

  get pending() {
    return this.containerPending || this.childPending;
  }

  get containerPending() {
    return this._pending;
  }

  protected _childPending = false;
  get childPending() {
    return this._childPending;
  }

  protected _childrenPending = false;
  get childrenPending() {
    return this._childrenPending;
  }

  // DIRTY

  get dirty() {
    return this.containerDirty || this.childDirty;
  }

  get containerDirty() {
    return this.containerTouched || this.containerChanged;
  }

  get childDirty() {
    return this._childTouched || this._childChanged;
  }

  get childrenDirty() {
    return this._childrenTouched || this._childrenChanged;
  }

  protected _controlsSubscriptions = new Map<AbstractControl, Subscription>();

  [ControlContainer.CONTROL_CONTAINER_INTERFACE]() {
    return this;
  }

  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null {
    if (args.length === 0) return null;
    else if (args.length === 1) return (this.controls as any)[args[0]];

    return args.reduce(
      (prev: AbstractControl | null, curr) => {
        if (ControlContainer.isControlContainer(prev)) {
          return prev.get(curr);
        }

        return null;
      },
      this as AbstractControl | null,
    );
  }

  abstract equalValue(
    value: any,
    options?: { assertShape?: boolean },
  ): value is Value;

  markChildrenDisabled(value: boolean, options?: ControlEventOptions) {
    this.controlsStore.forEach(control => {
      control.markDisabled(value, options);
    });
  }

  markChildrenTouched(value: boolean, options?: ControlEventOptions) {
    this.controlsStore.forEach(control => {
      control.markTouched(value, options);
    });
  }

  markChildrenChanged(value: boolean, options?: ControlEventOptions) {
    this.controlsStore.forEach(control => {
      control.markChanged(value, options);
    });
  }

  markChildrenReadonly(value: boolean, options?: ControlEventOptions) {
    this.controlsStore.forEach(control => {
      control.markReadonly(value, options);
    });
  }

  markChildrenSubmitted(value: boolean, options?: ControlEventOptions) {
    this.controlsStore.forEach(control => {
      control.markSubmitted(value, options);
    });
  }

  markChildrenPending(value: boolean, options?: ControlEventOptions) {
    this.controlsStore.forEach(control => {
      control.markPending(value, options);
    });
  }

  abstract setControls(...args: any[]): void;

  abstract setControl(...args: any[]): void;

  abstract addControl(...args: any[]): void;

  abstract removeControl(...args: any[]): void;

  replayState(options: ControlEventOptions = {}): Observable<StateChange> {
    this.controlsStore.forEach(() => {});
    return concat(
      of({
        id: '',
        source: options.source || this.id,
        processed: [this.id] as [ControlId],
        type: 'StateChange',
        changes: new Map<string, any>([
          ['controlsStore', new Map(this.controlsStore)],
          ['childDisabled', this.childDisabled],
          ['childrenDisabled', this.childrenDisabled],
          ['childTouched', this.childTouched],
          ['childrenTouched', this.childrenTouched],
          ['childChanged', this.childChanged],
          ['childrenChanged', this.childrenChanged],
          ['childReadonly', this.childReadonly],
          ['childrenReadonly', this.childrenReadonly],
          ['childInvalid', this.childInvalid],
          ['childrenInvalid', this.childrenInvalid],
          ['childPending', this.childPending],
          ['childrenPending', this.childrenPending],
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
          return event as StateChange;
        }),
      ),
      super.replayState(options),
    );
  }

  protected registerControls() {
    this.controlsStore.forEach((control, key) => {
      const fn = (event: ControlEvent) => {
        if (event.processed.includes(this.id)) return null;

        event.processed.push(this.id);

        const newEvent = this.processChildEvent({ control, key, event });

        if (!newEvent) return null;

        const callbacks: Array<() => void> = [];

        this.atomic.forEach(transaction => {
          const cfn = transaction(newEvent);

          if (cfn) callbacks.push(cfn);
        });

        return () => {
          this._events.next(newEvent);

          callbacks.forEach(cfn => cfn());
        };
      };

      control.atomic.set(this.id, fn.bind(this));
    });
  }

  protected deregisterControls() {
    this.controlsStore.forEach(control => {
      control.atomic.delete(this.id);
    });
  }

  protected setupControls(changes: Map<any, any>) {
    let asArray = Array.from(this.controlsStore);

    calcChildrenProps(this as any, 'disabled', asArray, changes);

    asArray = asArray.filter(([, c]) => c.enabled);

    calcChildrenProps(this as any, 'touched', asArray, changes);
    calcChildrenProps(this as any, 'readonly', asArray, changes);
    calcChildrenProps(this as any, 'changed', asArray, changes);
    calcChildrenProps(this as any, 'submitted', asArray, changes);
    calcChildrenProps(this as any, 'pending', asArray, changes);
    calcChildrenProps(this as any, 'invalid', asArray, changes);
  }

  protected processChildEvent(args: {
    control: AbstractControl;
    key: any;
    event: ControlEvent;
  }): ControlEvent | null {
    const { control, key, event } = args;

    switch (event.type) {
      case 'StateChange': {
        const changes = new Map();

        // here, we flatten changes which will result in redundant processing
        // e.g. we only need to process "disabled", "childDisabled",
        // "childrenDisabled" changes once per event.
        new Map(
          Array.from((event as StateChange).changes).map(([prop, value]) => {
            if (['childDisabled', 'childrenDisabled'].includes(prop)) {
              return ['disabled', undefined];
            }

            if (['childTouched', 'childrenTouched'].includes(prop)) {
              return ['touched', undefined];
            }

            if (['childPending', 'childrenPending'].includes(prop)) {
              return ['pending', undefined];
            }

            if (['childChanged', 'childrenChanged'].includes(prop)) {
              return ['changed', undefined];
            }

            if (['childReadonly', 'childrenReadonly'].includes(prop)) {
              return ['readonly', undefined];
            }

            if (
              ['childInvalid', 'childrenInvalid', 'errorsStore'].includes(prop)
            ) {
              return ['invalid', undefined];
            }

            return [prop, value];
          }),
        ).forEach((value, prop) => {
          const success = this.processChildStateChange({
            control,
            key,
            event: event as StateChange,
            prop,
            value,
            changes,
          });

          if (!success) {
            // we want to emit a state change from the parent
            // whenever the child emits a state change, to ensure
            // that `observe()` calls trigger properly
            changes.set('otherChildStateChange', undefined);
          }
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

  protected processChildStateChange(args: {
    control: AbstractControl;
    key: any;
    event: StateChange;
    prop: string;
    value: any;
    changes: Map<string, any>;
  }): boolean {
    const { control, prop, changes } = args;

    switch (prop) {
      case 'disabled': {
        let asArray = Array.from(this.controlsStore);

        calcChildrenProps(this as any, 'disabled', asArray, changes);

        asArray = asArray.filter(([, c]) => c.enabled);

        calcChildrenProps(this as any, 'touched', asArray, changes);
        calcChildrenProps(this as any, 'readonly', asArray, changes);
        calcChildrenProps(this as any, 'changed', asArray, changes);
        calcChildrenProps(this as any, 'submitted', asArray, changes);
        calcChildrenProps(this as any, 'pending', asArray, changes);
        calcChildrenProps(this as any, 'invalid', asArray, changes);

        return true;
      }
      case 'touched': {
        if (control.disabled) return true;

        const asArray = Array.from(this.controlsStore).filter(
          ([, c]) => c.enabled,
        );

        calcChildrenProps(this, 'touched', asArray, changes);

        return true;
      }
      case 'changed': {
        if (control.disabled) return true;

        const asArray = Array.from(this.controlsStore).filter(
          ([, c]) => c.enabled,
        );

        calcChildrenProps(this, 'changed', asArray, changes);

        return true;
      }
      case 'readonly': {
        if (control.disabled) return true;

        const asArray = Array.from(this.controlsStore).filter(
          ([, c]) => c.enabled,
        );

        calcChildrenProps(this, 'readonly', asArray, changes);

        return true;
      }
      case 'invalid': {
        if (control.disabled) return true;

        const asArray = Array.from(this.controlsStore).filter(
          ([, c]) => c.enabled,
        );

        calcChildrenProps(this, 'invalid', asArray, changes);

        return true;
      }
      case 'pending': {
        if (control.disabled) return true;

        const asArray = Array.from(this.controlsStore).filter(
          ([, c]) => c.enabled,
        );

        calcChildrenProps(this, 'pending', asArray, changes);

        return true;
      }
    }

    return false;
  }
}

// const asArray = Array.from(this.controlsStore).filter(
//   ([, c]) => c.enabled,
// );

// this._childPending = asArray.some(([, c]) => {
//   if (ControlContainer.isControlContainer(c)) {
//     return c.childPending;
//   } else {
//     return c.changed;
//   }
// });

// this._childrenPending =
//   this.controlsStore.size > 0 &&
//   asArray.every(([, c]) => {
//     if (ControlContainer.isControlContainer(c)) {
//       return c.childrenPending;
//     } else {
//       return c.changed;
//     }
//   });

export function calcChildrenProps(
  parent: ControlContainer,
  prop:
    | 'pending'
    | 'disabled'
    | 'touched'
    | 'submitted'
    | 'changed'
    | 'invalid'
    | 'readonly',
  controls: [any, AbstractControl][],
  changes: Map<any, any>,
) {
  const cprop = capitalize(prop);
  const childProp: string & keyof typeof parent = `child${cprop}` as any;
  const childrenProp: string & keyof typeof parent = `children${cprop}` as any;

  const child = parent[childProp];
  const children = parent[childrenProp];

  (parent as any)[`_${childProp}`] = controls.some(([, c]) => {
    if (ControlContainer.isControlContainer(c)) {
      return (c as any)[childProp];
    } else {
      return (c as any)[prop];
    }
  });

  (parent as any)[`_${childrenProp}`] =
    controls.length > 0 &&
    controls.every(([, c]) => {
      if (ControlContainer.isControlContainer(c)) {
        return (c as any)[childrenProp];
      } else {
        return (c as any)[prop];
      }
    });

  if (child !== parent[childProp]) {
    changes.set(childProp, parent[childProp]);
  }

  if (children !== parent[childrenProp]) {
    changes.set(childrenProp, parent[childrenProp]);
  }
}
