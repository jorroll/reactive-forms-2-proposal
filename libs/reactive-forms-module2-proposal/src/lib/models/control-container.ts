import { AbstractControl, ControlEventOptions } from './abstract-control';

export type ControlContainerControls<T> = T extends ControlContainer<infer C>
  ? C
  : never;

const INTERFACE = '@@ControlContainerInterface';

export abstract class ControlContainer<
  C = any,
  V = any,
  D = any
> extends AbstractControl<V, D> {
  static readonly CONTROL_CONTAINER_INTERFACE = INTERFACE;

  static isControlContainer(object?: any): object is ControlContainer {
    return (
      AbstractControl.isAbstractControl(object) &&
      typeof (object as any)[INTERFACE] === 'function' &&
      (object as any)[INTERFACE]() === object
    );
  }

  abstract controls: C;

  [INTERFACE]() {
    return this;
  }

  abstract get<A extends AbstractControl = AbstractControl>(
    ...args: any[]
  ): A | null;

  abstract setControl(...args: any[]): void;

  abstract addControl(...args: any[]): void;

  abstract removeControl(...args: any[]): void;

  abstract markAllTouched(value: boolean, options?: ControlEventOptions): void;
}
