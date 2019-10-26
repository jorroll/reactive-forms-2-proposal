import {
  AbstractControl,
  ControlEventOptions,
  DeepReadonly,
} from './abstract-control';

export type ControlContainerControls<T> = T extends ControlContainer<infer C>
  ? C
  : never;

export namespace ControlContainer {
  export const CONTROL_CONTAINER_INTERFACE = Symbol(
    '@@ControlContainerInterface',
  );
  export function isControlContainer(object?: any): object is ControlContainer {
    return (
      AbstractControl.isAbstractControl(object) &&
      typeof (object as any)[ControlContainer.CONTROL_CONTAINER_INTERFACE] ===
        'function' &&
      (object as any)[ControlContainer.CONTROL_CONTAINER_INTERFACE]() === object
    );
  }
}

export interface ControlContainer<
  Controls = any,
  Value = any,
  EnabledValue = any,
  Data = any
> extends AbstractControl<Value, Data> {
  controls: Controls;

  value: DeepReadonly<Value>;
  enabledValue: DeepReadonly<EnabledValue>;

  size: number;

  childDisabled: boolean;
  childReadonly: boolean;
  childSubmitted: boolean;
  childTouched: boolean;
  childChanged: boolean;
  childPending: boolean;
  childDirty: boolean;

  [ControlContainer.CONTROL_CONTAINER_INTERFACE](): this;

  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null;

  setControls(...args: any[]): void;

  setControl(...args: any[]): void;

  addControl(...args: any[]): void;

  removeControl(...args: any[]): void;
}
