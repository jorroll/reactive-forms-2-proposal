import {
  OnDestroy,
  OnChanges,
  Renderer2,
  ElementRef,
  InjectionToken,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AbstractControl, ControlEvent } from '../models';
import { ControlValueMapper } from './interface';
import { ControlAccessor } from '../accessors';
import { isValueStateChange } from './util';

export const NG_CONTROL_DIRECTIVE = new InjectionToken<
  NgBaseDirective<AbstractControl>
>('NG_CONTROL_DIRECTIVE');

export abstract class NgBaseDirective<T extends AbstractControl>
  implements ControlAccessor<T>, OnChanges, OnDestroy {
  static id = 0;
  abstract readonly control: T;

  valueMapper?: ControlValueMapper;

  protected accessorValidatorId = Symbol(
    `NgDirectiveAccessorValidator-${NgBaseDirective.id++}`,
  );

  protected onChangesSubscriptions: Subscription[] = [];
  protected subscriptions: Subscription[] = [];

  constructor(protected renderer: Renderer2, protected el: ElementRef) {}

  abstract ngOnChanges(...args: any[]): void;

  ngOnInit() {
    // The nativeElement will be a comment if a directive is place on
    // an `<ng-container>` element.
    if (!(this.el.nativeElement instanceof HTMLElement)) return;

    this.subscriptions.push(
      this.control
        .observe('touched', { ignoreNoEmit: true })
        .subscribe(touched => {
          if (touched) {
            this.renderer.addClass(this.el.nativeElement, 'sw-touched');
            this.renderer.removeClass(this.el.nativeElement, 'sw-untouched');
          } else {
            this.renderer.addClass(this.el.nativeElement, 'sw-untouched');
            this.renderer.removeClass(this.el.nativeElement, 'sw-touched');
          }
        }),
      this.control
        .observe('submitted', { ignoreNoEmit: true })
        .subscribe(submitted => {
          if (submitted) {
            this.renderer.addClass(this.el.nativeElement, 'sw-submitted');
            this.renderer.removeClass(this.el.nativeElement, 'sw-unsubmitted');
          } else {
            this.renderer.addClass(this.el.nativeElement, 'sw-unsubmitted');
            this.renderer.removeClass(this.el.nativeElement, 'sw-submitted');
          }
        }),
      this.control
        .observe('changed', { ignoreNoEmit: true })
        .subscribe(changed => {
          if (changed) {
            this.renderer.addClass(this.el.nativeElement, 'sw-changed');
            this.renderer.removeClass(this.el.nativeElement, 'sw-unchanged');
          } else {
            this.renderer.addClass(this.el.nativeElement, 'sw-unchanged');
            this.renderer.removeClass(this.el.nativeElement, 'sw-changed');
          }
        }),
    );
  }

  ngOnDestroy() {
    this.onChangesSubscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  protected assertValidValueMapper(name: string, mapper?: ControlValueMapper) {
    if (!mapper) return;

    if (typeof mapper !== 'object') {
      throw new Error(`${name} expected an object`);
    }

    if (typeof mapper.toControl !== 'function') {
      throw new Error(`${name} expected to have a "toControl" mapper function`);
    }

    if (typeof mapper.toAccessor !== 'function') {
      throw new Error(
        `${name} expected to have a "toAccessor" mapper function`,
      );
    }

    if (
      mapper.accessorValidator &&
      typeof mapper.accessorValidator !== 'function'
    ) {
      throw new Error(
        `${name} optional "accessorValidator" expected to be a function`,
      );
    }
  }

  protected toProvidedControlMapFn() {
    if (this.valueMapper) {
      const valueMapper = this.valueMapper;

      return (event: ControlEvent) => {
        if (isValueStateChange(event)) {
          const changes = new Map(event.changes);

          changes.set(
            'value',
            valueMapper.toControl(event.changes.get('value')),
          );

          return {
            ...event,
            changes,
          };
        }

        return event;
      };
    }

    return (event: ControlEvent) => event;
  }

  protected toAccessorControlMapFn() {
    if (this.valueMapper) {
      const valueMapper = this.valueMapper;

      return (event: ControlEvent) => {
        if (isValueStateChange(event)) {
          const changes = new Map(event.changes);

          changes.set(
            'value',
            valueMapper.toAccessor(event.changes.get('value')),
          );

          return {
            ...event,
            changes,
          };
        }

        return event;
      };
    }

    return (event: ControlEvent) => event;
  }
}
