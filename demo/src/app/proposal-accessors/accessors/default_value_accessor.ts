/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ElementRef, InjectionToken, Renderer2, Injector } from '@angular/core';
import { ɵgetDOM as getDOM } from '@angular/platform-browser';
import { SW_DEFAULT_CONTROL_ACCESSOR_TOKEN } from './control_value_accessor';
import { distinctUntilChanged } from 'rxjs/operators';
import { setupListeners, watchProp } from './util';
import { FormControl, ControlAccessor } from 'reactive-forms-module2-proposal';

/**
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

export class DefaultValueAccessor implements ControlAccessor {
  readonly control = new FormControl();

  protected renderer: Renderer2;
  protected el: ElementRef;
  protected _compositionMode: boolean;

  constructor(inj: Injector) {
    this.renderer = inj.get(Renderer2);
    this.el = inj.get(ElementRef);
    this._compositionMode = inj.get(COMPOSITION_BUFFER_MODE, null);

    setupListeners(this, 'blur', 'onTouched');
    setupListeners(this, 'input', '_handleInput');
    setupListeners(this, 'compositionstart', '_compositionStart');
    setupListeners(this, 'compositionend', '_compositionEnd');

    if (this._compositionMode == null) {
      this._compositionMode = !_isAndroid();
    }

    watchProp(this.control, 'value').subscribe(value => {
      const normalizedValue = value == null ? '' : value;
      this.renderer.setProperty(
        this.el.nativeElement,
        'value',
        normalizedValue,
      );
    });

    watchProp(this.control, 'disabled')
      .pipe(distinctUntilChanged())
      .subscribe(isDisabled => {
        this.renderer.setProperty(
          this.el.nativeElement,
          'disabled',
          isDisabled,
        );
      });
  }

  /** Whether the user is creating a composition string (IME events). */
  private _composing = false;
  /**
   * @description
   * The registered callback function called when an input event occurs on the input element.
   */
  onChange = (_: any) => {
    this.control.markChanged(true);
    this.control.setValue(_);
  }

  /**
   * @description
   * The registered callback function called when a blur event occurs on the input element.
   */
  onTouched = () => {
    this.control.markTouched(true);
  }

  /** @internal */
  _handleInput(event: any): void {
    const value = event.target.value;

    if (!this._compositionMode || (this._compositionMode && !this._composing)) {
      this.onChange(value);
    }
  }

  /** @internal */
  _compositionStart(): void {
    this._composing = true;
  }

  /** @internal */
  _compositionEnd(event: any): void {
    const value = event.target.value;

    this._composing = false;

    if (this._compositionMode) {
      this.onChange(value);
    }
  }
}

export const DEFAULT_VALUE_ACCESSOR_SELECTORS =
  'input:not([type=checkbox]),textarea,[swDefaultControl]';

export const DEFAULT_VALUE_ACCESSOR_PROVIDER = {
  provide: SW_DEFAULT_CONTROL_ACCESSOR_TOKEN,
  useValue: [DEFAULT_VALUE_ACCESSOR_SELECTORS, DefaultValueAccessor],
};
