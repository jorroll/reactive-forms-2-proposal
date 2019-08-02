/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ElementRef, InjectionToken, Renderer2, Injector } from '@angular/core';
import { ɵgetDOM as getDOM } from '@angular/platform-browser';
import {
  // ControlValueAccessor,
  SW_VALUE_ACCESSOR,
  SW_DEFAULT_VALUE_ACCESSOR,
} from './control_value_accessor';
import { map, distinctUntilChanged, filter } from 'rxjs/operators';
import { setupListeners } from './util';
import { AbstractControl, FormControl } from '../models';

interface ControlValueAccessor {
  control: AbstractControl;
}

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

export class DefaultValueAccessor implements ControlValueAccessor {
  control = new FormControl();

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

    this.control.valueChanges.subscribe(value => {
      const normalizedValue = value == null ? '' : value;
      this.renderer.setProperty(
        this.el.nativeElement,
        'value',
        normalizedValue,
      );
    });

    // this.control.valueChanges.subscribe(value => {
    //   console.log('value', value);
    // });

    // this.control.changes.subscribe(state => {
    //   console.log('changes', state);
    // });

    this.control.statusChanges
      .pipe(
        map(status => status === 'DISABLED'),
        distinctUntilChanged(),
      )
      .subscribe(isDisabled => {
        this.renderer.setProperty(
          this.el.nativeElement,
          'disabled',
          isDisabled,
        );
      });

    this.control.changes
      .pipe(
        filter(({ type }) => type === 'required'),
        map(({ value }) => value),
        distinctUntilChanged(),
      )
      .subscribe(isRequired => {
        this.renderer.setProperty(
          this.el.nativeElement,
          'required',
          isRequired,
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

  /**
   * Sets the "value" property on the input element.
   *
   * @param value The checked value
   */
  writeValue(value: any): void {
    const normalizedValue = value == null ? '' : value;
    this.renderer.setProperty(this.el.nativeElement, 'value', normalizedValue);
  }

  /**
   * @description
   * Registers a function called when the control value changes.
   *
   * @param fn The callback function
   */
  registerOnChange(fn: (_: any) => void): void {
    this.onChange = fn;
  }

  /**
   * @description
   * Registers a function called when the control is touched.
   *
   * @param fn The callback function
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Sets the "disabled" property on the input element.
   *
   * @param isDisabled The disabled value
   */
  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'disabled', isDisabled);
  }

  /**
   * Sets the "required" property on the input element.
   *
   * @param isRequired The required value
   */
  setRequiredState(isRequired: boolean): void {
    this.renderer.setProperty(this.el.nativeElement, 'required', isRequired);
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
    this._compositionMode && this.onChange(value);
  }
}

export const DEFAULT_VALUE_ACCESSOR_SELECTORS =
  'input:not([type=checkbox]),textarea,[swDefaultControl]';

export const DEFAULT_VALUE_ACCESSOR_PROVIDER = {
  provide: SW_DEFAULT_VALUE_ACCESSOR,
  useValue: [DEFAULT_VALUE_ACCESSOR_SELECTORS, DefaultValueAccessor],
};
