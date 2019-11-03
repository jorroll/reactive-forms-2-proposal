import {
  Input,
  OnDestroy,
  OnChanges,
  Directive,
  ElementRef,
  Inject,
  Self,
  SimpleChange,
  SimpleChanges,
  SkipSelf,
  forwardRef,
  Renderer2,
} from '@angular/core';
import {
  FormControl,
  NG_CONTROL_CONTAINER_ACCESSOR,
  ControlContainerAccessor,
  ControlAccessor,
  NG_CONTROL_DIRECTIVE,
  ɵNgControlNameDirective,
} from 'reactive-forms-module2-proposal';

import {
  FormControlDirective,
  NgControl,
  ControlValueAccessor,
} from '@angular/forms';

import { NgCompatFormControl } from './ng_compat_form_control';

@Directive({
  selector: '[ngFormControlName][formControl]',
  exportAs: 'ngCompatForm',
  providers: [
    {
      provide: NG_CONTROL_DIRECTIVE,
      useExisting: forwardRef(() => NgCompatFormControlNameDirective),
    },
  ],
})
export class NgCompatFormControlNameDirective
  extends ɵNgControlNameDirective<FormControl>
  implements ControlAccessor, OnChanges, OnDestroy {
  static id = 0;

  @Input('ngFormControlName') controlName!: string;

  protected ngControl = new NgCompatFormControl(
    new FormControl(undefined, {
      id: Symbol(
        `NgCompatFormControlNameDirective-${NgCompatFormControlNameDirective.id++}`,
      ),
    }),
  );

  control = this.ngControl.swControl;

  protected valueAccessor: ControlValueAccessor | null;

  constructor(
    @Self()
    @Inject(NgControl)
    protected ngDirective: FormControlDirective,
    @SkipSelf()
    @Inject(NG_CONTROL_CONTAINER_ACCESSOR)
    protected containerAccessor: ControlContainerAccessor,
    renderer: Renderer2,
    el: ElementRef,
  ) {
    super(renderer, el);

    const self = this;

    const orig = this.ngDirective.ngOnChanges.bind(this.ngDirective);

    let index = 0;

    this.ngDirective.ngOnChanges = (changes: SimpleChanges) => {
      const old = self.ngDirective.form;
      self.ngDirective.form = self.ngControl;
      orig({
        ...changes,
        form: new SimpleChange(old, self.ngControl, index === 0),
      });
      index++;
    };

    this.valueAccessor = this.ngDirective.valueAccessor;
  }

  ngOnChanges(_: { controlName?: SimpleChange }) {
    if (!this.controlName) {
      throw new Error(
        `NgCompatFormControlNameDirective must be passed a ngFormControlName`,
      );
    }

    super.ngOnChanges(_);
  }

  protected validateProvidedControl(control: any): control is FormControl {
    if (!(control instanceof FormControl)) {
      throw new Error(
        'NgCompatFormControlNameDirective must link to an instance of FormControl',
      );
    }

    return true;
  }
}
