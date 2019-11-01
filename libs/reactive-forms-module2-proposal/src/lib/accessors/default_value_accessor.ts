/**
 * This code is a modified version of code taken from `@angular/forms`
 */

import {
  ElementRef,
  InjectionToken,
  Renderer2,
  forwardRef,
  Inject,
  Optional,
  Directive,
  HostListener,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ɵgetDOM as getDOM } from '@angular/platform-browser';
import { filter, map } from 'rxjs/operators';
import { setupListeners } from './util';
import { FormControl } from '../models';
import { NG_CONTROL_ACCESSOR, ControlAccessor } from './interface';
import { from, fromEvent, Subscription } from 'rxjs';

/**
 * _Note: I've no idea why this is needed. It's a carry_
 * _over from the `@angular/forms` code which I figured I'd keep._
 *
 * We must check whether the agent is Android because composition events
 * behave differently between iOS and Android.
 */
function _isAndroid(): boolean {
  const userAgent = getDOM() ? getDOM().getUserAgent() : '';
  return /android (\d+)/.test(userAgent.toLowerCase());
}

/**
 * @description
 * Provide this token to control if form directives buffer IME input until
 * the "compositionend" event occurs.
 * @publicApi
 */
export const COMPOSITION_BUFFER_MODE = new InjectionToken<boolean>(
  'CompositionEventMode',
);

/**
 * @description
 * The default `ControlValueAccessor` for writing a value and listening to changes on input
 * elements. The accessor is used by the `FormControlDirective`, `FormControlName`, and
 * `NgModel` directives.
 *
 * @usageNotes
 *
 * ### Using the default value accessor
 *
 * The following example shows how to use an input element that activates the default value accessor
 * (in this case, a text field).
 *
 * ```ts
 * const firstNameControl = new FormControl();
 * ```
 *
 * ```
 * <input type="text" [formControl]="firstNameControl">
 * ```
 *
 * @ngModule ReactiveFormsModule
 * @ngModule FormsModule
 * @publicApi
 */
@Directive({
  selector: 'input:not([type=checkbox]),textarea,[ngDefaultControl]',
  providers: [
    {
      provide: NG_CONTROL_ACCESSOR,
      useExisting: forwardRef(() => DefaultValueAccessor),
      multi: true,
    },
  ],
})
// tslint:disable-next-line: directive-class-suffix
export class DefaultValueAccessor
  implements ControlAccessor, OnInit, OnDestroy {
  readonly control = new FormControl();

  private subscriptions: Subscription[] = [];

  /** Whether the user is creating a composition string (IME events). */
  private _composing = false;

  constructor(
    protected renderer: Renderer2,
    protected el: ElementRef<HTMLInputElement>,
    @Optional()
    @Inject(COMPOSITION_BUFFER_MODE)
    protected compositionMode: boolean | null,
  ) {}

  ngOnInit() {
    if (this.compositionMode == null) {
      this.compositionMode = !_isAndroid();
    }

    this.subscriptions.push(
      // watch outside value changes
      this.control.events
        .pipe(
          filter(
            ({ source, type, changes }) =>
              source !== this.control.id &&
              type === 'StateChange' &&
              changes.has('value'),
          ),
          map(({ changes }) => changes.get('value')),
        )
        .subscribe(value => {
          const normalizedValue = value == null ? '' : value;
          this.renderer.setProperty(
            this.el.nativeElement,
            'value',
            normalizedValue,
          );
        }),
      // watch for focus change events
      this.control.focusChanges.subscribe(value => {
        if (value) {
          this.el.nativeElement.focus();
        } else {
          this.el.nativeElement.blur();
        }
      }),
      // monitor disabled state
      this.control
        .observe('disabled', { ignoreNoEmit: true })
        .subscribe(disabled => {
          this.renderer.setProperty(
            this.el.nativeElement,
            'disabled',
            disabled,
          );
        }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  @HostListener('blur') onBlur() {
    this.control.markTouched(true);
  }

  @HostListener('input', ['$event']) onInput(event: any) {
    const value = event.target.value;

    if (!this.compositionMode || (this.compositionMode && !this._composing)) {
      this.control.markChanged(true);
      this.control.setValue(value);
    }
  }

  @HostListener('compositionstart') onCompositionStart() {
    this._composing = true;
  }

  @HostListener('compositionend', ['$event']) onCompositionEnd(event: any) {
    const value = event.target.value;

    this._composing = false;

    if (this.compositionMode) {
      this.control.markChanged(true);
      this.control.setValue(value);
    }
  }
}
