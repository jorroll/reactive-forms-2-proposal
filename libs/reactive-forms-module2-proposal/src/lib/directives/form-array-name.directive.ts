import {
  Input,
  OnDestroy,
  OnChanges,
  Directive,
  Inject,
  SimpleChange,
  SkipSelf,
  Renderer2,
  ElementRef,
  forwardRef,
} from '@angular/core';
import { FormArray } from '../models';
import { ControlValueMapper } from './interface';
import { NG_CONTROL_DIRECTIVE } from './base.directive';
import {
  ControlAccessor,
  NG_CONTROL_CONTAINER_ACCESSOR,
  ControlContainerAccessor,
} from '../accessors';
import { NgControlNameDirective } from './control-name.directive';

@Directive({
  selector: '[ngFormArrayName]',
  exportAs: 'ngForm',
  providers: [
    {
      provide: NG_CONTROL_DIRECTIVE,
      useExisting: forwardRef(() => NgFormArrayNameDirective),
    },
    {
      provide: NG_CONTROL_CONTAINER_ACCESSOR,
      useExisting: forwardRef(() => NgFormArrayNameDirective),
    },
  ],
})
export class NgFormArrayNameDirective extends NgControlNameDirective<FormArray>
  implements ControlAccessor, OnChanges, OnDestroy {
  static id = 0;

  @Input('ngFormArrayName') controlName!: string;
  @Input('ngFormArrayValueMapper')
  valueMapper: ControlValueMapper | undefined;

  readonly control = new FormArray<any>(
    {},
    {
      id: Symbol(`NgFormArrayNameDirective-${NgFormArrayNameDirective.id++}`),
    },
  );

  constructor(
    @SkipSelf()
    @Inject(NG_CONTROL_CONTAINER_ACCESSOR)
    protected containerAccessor: ControlContainerAccessor,
    renderer: Renderer2,
    el: ElementRef,
  ) {
    super(renderer, el);
  }

  ngOnChanges(_: { controlName?: SimpleChange; valueMapper?: SimpleChange }) {
    if (!this.controlName) {
      throw new Error(
        `NgFormArrayNameDirective must be passed a ngFormControlName`,
      );
    }

    this.assertValidValueMapper(
      'NgFormArrayNameDirective#ngFormControlValueMapper',
      this.valueMapper,
    );

    super.ngOnChanges(_);
  }

  protected validateProvidedControl(control: any): control is FormArray {
    if (!(control instanceof FormArray)) {
      throw new Error(
        'NgFormArrayNameDirective must link to an instance of FormArray',
      );
    }

    return true;
  }
}
