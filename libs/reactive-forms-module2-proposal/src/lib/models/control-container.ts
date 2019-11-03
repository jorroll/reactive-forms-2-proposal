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
  readonly controlsStore: ReadonlyMap<any, AbstractControl>;

  readonly size: number;

  readonly value: DeepReadonly<Value>;
  /**
   * Only returns values for `enabled` child controls. If a
   * child control is itself a `ControlContainer`, it will return
   * the `enabledValue` for that child.
   */
  readonly enabledValue: DeepReadonly<EnabledValue>;

  /** Will return true if `containerValid` and `childrenValid` */
  readonly valid: boolean;
  /** Will return true if the `ControlContainer` has no errors. */
  readonly containerValid: boolean;
  /** Will return true if *any* enabled child control is valid */
  readonly childValid: boolean;
  /** Will return true if *all* enabled child control's are valid */
  readonly childrenValid: boolean;

  /** Will return true if `containerInvalid` or `childInvalid` */
  readonly invalid: boolean;
  /** Will return true if the `ControlContainer` has any errors. */
  readonly containerInvalid: boolean;
  /** Will return true if *any* enabled child control is invalid */
  readonly childInvalid: boolean;
  /** Will return true if *all* enabled child control's are invalid */
  readonly childrenInvalid: boolean;

  /** Will return true if `containerDisabled` or `childrenDisabled` */
  readonly disabled: boolean;
  /** Will return true if the `ControlContainer` is disabled. */
  readonly containerDisabled: boolean;
  /** Will return true if *any* child control is disabled */
  readonly childDisabled: boolean;
  /** Will return true if *all* child control's are disabled */
  readonly childrenDisabled: boolean;

  /** Will return true if `containerReadonly` or `childrenReadonly` */
  readonly readonly: boolean;
  /** Will return true if the `ControlContainer` is readonly. */
  readonly containerReadonly: boolean;
  /** Will return true if *any* enabled child control is readonly */
  readonly childReadonly: boolean;
  /** Will return true if *all* enabled child control's are readonly */
  readonly childrenReadonly: boolean;

  /** Will return true if `containerPending` or `childrenPending` */
  readonly pending: boolean;
  /** Will return true if the `ControlContainer` is pending. */
  readonly containerPending: boolean;
  /** Will return true if *any* enabled child control is pending */
  readonly childPending: boolean;
  /** Will return true if *all* enabled child control's are pending */
  readonly childrenPending: boolean;

  /** Will return true if `containerTouched` or `childrenTouched` */
  readonly touched: boolean;
  /** Will return true if the `ControlContainer` is touched. */
  readonly containerTouched: boolean;
  /** Will return true if *any* enabled child control is touched */
  readonly childTouched: boolean;
  /** Will return true if *all* enabled child control's are touched */
  readonly childrenTouched: boolean;

  /** Will return true if `containerChanged` or `childrenChanged` */
  readonly changed: boolean;
  /** Will return true if the `ControlContainer` is changed. */
  readonly containerChanged: boolean;
  /** Will return true if *any* enabled child control is changed */
  readonly childChanged: boolean;
  /** Will return true if *all* enabled child control's are changed */
  readonly childrenChanged: boolean;

  /** Will return true if `containerSubmitted` or `childrenSubmitted` */
  readonly submitted: boolean;
  /** Will return true if the `ControlContainer` is submitted. */
  readonly containerSubmitted: boolean;
  /** Will return true if *any* enabled child control is submitted */
  readonly childSubmitted: boolean;
  /** Will return true if *all* enabled child control's are submitted */
  readonly childrenSubmitted: boolean;

  /** Will return true if `containerDirty` or `childrenDirty` */
  readonly dirty: boolean;
  /** Will return true if `containerTouched` or `containerChanged`. */
  readonly containerDirty: boolean;
  /** Will return true if *any* enabled child control is dirty */
  readonly childDirty: boolean;
  /** Will return true if *all* enabled child control's are dirty */
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
