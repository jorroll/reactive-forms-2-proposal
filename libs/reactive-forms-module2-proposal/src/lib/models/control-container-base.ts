import { Subscription, concat, from, Observable, merge } from 'rxjs';
import { map, filter, tap } from 'rxjs/operators';
import {
  AbstractControl,
  ControlEvent,
  ControlEventOptions,
  DeepReadonly,
  ProcessedControlEvent,
  ControlId,
  ValidationErrors,
} from './abstract-control';
import { ControlContainer } from './control-container';
import { ControlBase } from './control-base';

export abstract class ControlContainerBase<Controls, Value, EnabledValue, Data>
  extends ControlBase<Value, Data>
  implements ControlContainer<Controls, Value, EnabledValue, Data> {
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

  protected _invalid!: boolean;
  get invalid() {
    return this._invalid;
  }
  get valid() {
    return !this._invalid;
  }

  protected _childDisabled = false;
  get childDisabled() {
    return this._childDisabled;
  }
  protected _childReadonly = false;
  get childReadonly() {
    return this._childReadonly;
  }

  protected _childSubmitted = false;
  get childSubmitted() {
    return this._childSubmitted;
  }

  protected _childTouched = false;
  get childTouched() {
    return this._childTouched;
  }

  protected _childChanged = false;
  get childChanged() {
    return this._childChanged;
  }

  protected _childPending = false;
  get childPending() {
    return this._childPending;
  }

  get childDirty() {
    return this._childTouched || this._childChanged;
  }

  protected _normalizedControls: [any, AbstractControl][] = [];
  protected _sourceSubscription?: Subscription;

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

  setControls(controls: Controls, options: ControlEventOptions = {}) {
    this.source.next(this.buildEvent('controls', controls, options));
  }

  abstract setControl(...args: any[]): void;

  abstract addControl(...args: any[]): void;

  abstract removeControl(...args: any[]): void;

  replayState(
    options: ControlEventOptions = {},
  ): Observable<ProcessedControlEvent<string, any>> {
    const state = [this.buildEvent('controls', this.controls, options)];

    return concat(
      from(state).pipe(
        map(event => {
          // we reset the applied array so that this saved
          // state change can be applied to the same control
          // multiple times
          event.id = AbstractControl.eventId++;
          (event as any).applied = [];
          event.stateChange = true;
          return event;
        }),
      ),
      super.replayState(options),
    );
  }

  protected abstract validateValueShape(value: Value, eventId: number): void;

  protected abstract processValue(): Value;
  protected abstract processEnabledValue(): EnabledValue;

  protected processInvalid() {
    return (
      !!this._errors ||
      (this._normalizedControls || [])
        .filter(([, c]) => c.enabled)
        .some(([, c]) => c.invalid)
    );
  }

  protected setupSource() {
    if (this._sourceSubscription) {
      this._sourceSubscription.unsubscribe();
    }

    /**
     * So there's an open question of how ControlContainers should handle
     * child events. We could emit everything, which can
     * *easily* add up to thousands of ControlEvents for a relatively
     * modest nested FormGroup. It's currently unclear if this adds up
     * to a noticable performance cost, however.
     *
     * For FormGroupDirective functionality, we don't need to emit child
     * events because the linked FormGroup will have the same child control's
     * as the provided FormGroup (meaning it will be receiving the same
     * child control events as the provided FormGroup).
     *
     * Note: adding a explicit child events such as "disabledChild"
     * ended up being a bad idea. In order for a "disabledChild" event to
     * work, it needs to spawn child ControlEvents of its own. These child
     * control events will appear to come from the control processing the
     * "disabledChild" event, frustrating any effort to deduplicate these
     * excess events coming from linked FormGroups.
     *
     * In general, it's a bad idea for the processEvent logic for a ControlEvent
     * to create child ControlEvents.
     */

    concat(
      ...this._normalizedControls.map(([key, control]) =>
        control.replayState().pipe(
          map(event => ({
            id: AbstractControl.eventId++,
            source: event.source,
            applied: event.applied,
            type: 'childEvent',
            value: event,
            meta: {},
            controlId: control.id,
            controlKey: key,
            stateChange: event.stateChange,
          })),
        ),
      ),
    ).subscribe(event => this.processChildEvent(event));

    this._sourceSubscription = merge(
      ...this._normalizedControls.map(([key, control]) =>
        merge(
          control.observeChanges('invalid', { ignoreNoEmit: true }).pipe(
            map(invalid => ({
              id: AbstractControl.id++,
              source: control.id,
              applied: [control.id],
              type: 'invalid',
              value: invalid,
              stateChange: true,
              meta: {},
            })),
          ),
          control.events,
        ).pipe(
          // we should ignore state changes from disabled controls
          // this will be tricky though. e.g. a "pending" state
          // change could come from a child, then the child is
          // disabled, and the "pending" status isn't cleared
          filter(
            ({ applied, stateChange }) =>
              !!stateChange && !applied.includes(this.id),
          ),
          map(event => {
            return {
              id: AbstractControl.eventId++,
              source: event.source,
              applied: event.applied,
              type: 'childEvent',
              value: event,
              meta: {},
              controlId: control.id,
              controlKey: key,
              stateChange: event.stateChange,
            };
          }),
        ),
      ),
    ).subscribe(this.source);
  }

  protected processEvent(event: ProcessedControlEvent<string, any>): boolean {
    const { type, value } = event;

    const controls = (this._normalizedControls || []).map(([, c]) => c);

    switch (event.type) {
      case 'submitted': {
        event.stateChange = true;
        this._submitted = value;
        controls.forEach(c => {
          c.source.next({
            source: event.source,
            applied: [this.id],
            type,
            value,
            noEmit: event.noEmit,
            memo: event.memo,
          });
        });
        this._childSubmitted = value;
        return true;
      }
      case 'touched': {
        event.stateChange = true;
        this._touched = value;
        controls.forEach(c => {
          c.source.next({
            source: event.source,
            applied: [this.id],
            type,
            value,
            noEmit: event.noEmit,
            memo: event.memo,
          });
        });
        this._childTouched = value;
        return true;
      }
      case 'changed': {
        event.stateChange = true;
        this._changed = value;
        controls.forEach(c => {
          c.source.next({
            source: event.source,
            applied: [this.id],
            type,
            value,
            noEmit: event.noEmit,
            memo: event.memo,
          });
        });
        this._childChanged = value;
        return true;
      }
      case 'readonly': {
        event.stateChange = true;
        this._readonly = value;
        controls.forEach(c => {
          c.source.next({
            source: event.source,
            applied: [this.id],
            type,
            value,
            noEmit: event.noEmit,
            memo: event.memo,
          });
        });
        this._childReadonly = value;
        return true;
      }
    }

    return super.processEvent(event);
  }

  protected processChildEvent(
    parentEvent: ProcessedControlEvent<string, any>,
  ): boolean {
    const event = parentEvent.value;

    const { type } = event;
    const controls = (this._normalizedControls || [])
      .filter(([, c]) => c.enabled)
      .map(([, c]) => c);

    switch (type) {
      case 'invalid': {
        parentEvent.stateChange = true;
        this._invalid = this.processInvalid();
        return true;
      }
      case 'submitted': {
        parentEvent.stateChange = true;
        this._childSubmitted = controls.some(c => c.submitted);
        this._submitted = controls.every(c => c.submitted);
        return true;
      }
      case 'touched': {
        parentEvent.stateChange = true;
        this._childTouched = controls.some(c => c.touched);
        this._touched = controls.every(c => c.touched);
        return true;
      }
      case 'changed': {
        parentEvent.stateChange = true;
        this._childChanged = controls.some(c => c.changed);
        this._changed = controls.every(c => c.changed);
        return true;
      }
      case 'readonly': {
        parentEvent.stateChange = true;
        this._childReadonly = controls.some(c => c.readonly);
        this._readonly = controls.every(c => c.readonly);
        return true;
      }
      case 'pending':
      case 'pendingStore': {
        parentEvent.stateChange = true;
        this._childPending = controls.some(c => c.pending);
        return true;
      }
      case 'controls':
      case 'disabled': {
        parentEvent.stateChange = true;
        this._childDisabled = controls.some(c => c.disabled);
        this._disabled = controls.every(c => c.disabled);
        this._childSubmitted = controls.some(c => c.submitted);
        this._submitted = controls.every(c => c.submitted);
        this._childTouched = controls.some(c => c.touched);
        this._touched = controls.every(c => c.touched);
        this._childChanged = controls.some(c => c.changed);
        this._changed = controls.every(c => c.changed);
        this._childReadonly = controls.some(c => c.readonly);
        this._readonly = controls.every(c => c.readonly);
        this._childPending = controls.some(c => c.pending);
        this._pending =
          this._childPending ||
          Array.from(this.pendingStore.values()).some(val => val);
        this._value = this.processValue();
        this._enabledValue = this.processEnabledValue();
        this._invalid = this.processInvalid();
        return true;
      }
      case 'childEvent': {
        return this.processChildEvent(event);
      }
    }

    return false;
  }
}
