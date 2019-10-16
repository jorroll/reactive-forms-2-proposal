import {
  OnDestroy,
  OnChanges,
  Renderer2,
  ElementRef,
  Input,
  InjectionToken,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AbstractControl, ControlEvent } from '../models';
import { ControlStateMapper, ControlValueMapper } from './interface';
import { filter, map, startWith } from 'rxjs/operators';
import { ControlAccessor } from '../accessors';

export const NG_CONTROL_DIRECTIVE = new InjectionToken<
  NgBaseDirective<AbstractControl>
>('NG_CONTROL_DIRECTIVE');

export abstract class NgBaseDirective<T extends AbstractControl>
  implements ControlAccessor<T>, OnChanges, OnDestroy {
  static id = 0;

  abstract readonly control: T;

  id = Symbol(`NgBaseDirective ${NgBaseDirective.id}`);

  stateMapper?: ControlStateMapper;
  valueMapper?: ControlValueMapper;

  protected onChangesSubscriptions: Subscription[] = [];
  protected subscriptions: Subscription[] = [];

  constructor(protected renderer: Renderer2, protected el: ElementRef) {
    NgBaseDirective.id++;
  }

  abstract ngOnChanges(...args: any[]): void;

  ngOnInit() {
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

  protected toProvidedControlMapFn() {
    if (this.stateMapper && this.valueMapper) {
      const stateMapper = this.stateMapper;
      const valueMapper = this.valueMapper;

      return (state: ControlEvent<string, any>) => {
        if (state.type === 'value') {
          state = {
            ...state,
            value: valueMapper.toControl(state.value),
          };
        }

        return stateMapper.toControl(state);
      };
    } else if (this.stateMapper) {
      const stateMapper = this.stateMapper;

      return (state: ControlEvent<string, any>) => stateMapper.toControl(state);
    } else if (this.valueMapper) {
      const valueMapper = this.valueMapper;

      return (state: ControlEvent<string, any>) => {
        if (state.type === 'value') {
          return {
            ...state,
            value: valueMapper.toControl(state.value),
          };
        }

        return state;
      };
    } else {
      return (state: ControlEvent<string, any>) => state;
    }
  }

  protected fromProvidedControlMapFn() {
    if (this.stateMapper && this.valueMapper) {
      const stateMapper = this.stateMapper;
      const valueMapper = this.valueMapper;

      return (state: ControlEvent<string, any>) => {
        if (state.type === 'value') {
          state = {
            ...state,
            value: valueMapper.fromControl(state.value),
          };
        }

        return stateMapper.fromControl(state);
      };
    } else if (this.stateMapper) {
      const stateMapper = this.stateMapper;

      return (state: ControlEvent<string, any>) =>
        stateMapper.fromControl(state);
    } else if (this.valueMapper) {
      const valueMapper = this.valueMapper;

      return (state: ControlEvent<string, any>) => {
        if (state.type === 'value') {
          return {
            ...state,
            value: valueMapper.fromControl(state.value),
          };
        }

        return state;
      };
    } else {
      return (state: ControlEvent<string, any>) => state;
    }
  }
}
