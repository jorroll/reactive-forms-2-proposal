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
  readonly controls: Controls;
  readonly controlsStore: ReadonlyMap<string, AbstractControl>;

  readonly size: number;

  readonly value: DeepReadonly<Value>;
  readonly enabledValue: DeepReadonly<EnabledValue>;

  readonly containerValid: boolean;
  readonly childValid: boolean;
  readonly childrenValid: boolean;

  readonly containerInvalid: boolean;
  readonly childInvalid: boolean;
  readonly childrenInvalid: boolean;

  readonly containerDisabled: boolean;
  readonly childDisabled: boolean;
  readonly childrenDisabled: boolean;

  readonly containerReadonly: boolean;
  readonly childReadonly: boolean;
  readonly childrenReadonly: boolean;

  readonly containerPending: boolean;
  readonly childPending: boolean;
  readonly childrenPending: boolean;

  readonly containerTouched: boolean;
  readonly childTouched: boolean;
  readonly childrenTouched: boolean;

  readonly containerChanged: boolean;
  readonly childChanged: boolean;
  readonly childrenChanged: boolean;

  readonly containerSubmitted: boolean;
  readonly childSubmitted: boolean;
  readonly childrenSubmitted: boolean;

  readonly containerDirty: boolean;
  readonly childDirty: boolean;
  readonly childrenDirty: boolean;

  [ControlContainer.CONTROL_CONTAINER_INTERFACE](): this;

  equalValue(value: any, options?: { assertShape?: boolean }): value is Value;

  get<A extends AbstractControl = AbstractControl>(...args: any[]): A | null;

  setControls(...args: any[]): void;

  setControl(...args: any[]): void;

  addControl(...args: any[]): void;

  removeControl(...args: any[]): void;

  markChildrenDisabled(value: boolean, options?: ControlEventOptions): void;
  markChildrenTouched(value: boolean, options?: ControlEventOptions): void;
  markChildrenChanged(value: boolean, options?: ControlEventOptions): void;
  markChildrenReadonly(value: boolean, options?: ControlEventOptions): void;
  markChildrenSubmitted(value: boolean, options?: ControlEventOptions): void;
  markChildrenPending(value: boolean, options?: ControlEventOptions): void;
}
