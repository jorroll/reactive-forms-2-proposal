import {
  Input,
  OnDestroy,
  OnChanges,
  Directive,
  Inject,
  Self,
  SimpleChange,
  SkipSelf,
  Renderer2,
  ElementRef,
  forwardRef,
} from '@angular/core';
import { concat } from 'rxjs';
import { FormControl } from '../models';
import { ControlValueMapper } from './interface';
import { NG_CONTROL_DIRECTIVE } from './base.directive';
import {
  ControlAccessor,
  NG_CONTROL_ACCESSOR,
  NG_CONTROL_CONTAINER_ACCESSOR,
  ControlContainerAccessor,
} from '../accessors';
import { resolveControlAccessor } from './util';
import { NgControlNameDirective } from './control-name.directive';

@Directive({
  selector: '[ngFormControlName]:not([formControl])',
  exportAs: 'ngForm',
  providers: [
    {
      provide: NG_CONTROL_DIRECTIVE,
      useExisting: forwardRef(() => NgFormControlNameDirective),
    },
  ],
})
export class NgFormControlNameDirective
  extends NgControlNameDirective<FormControl>
  implements ControlAccessor, OnChanges, OnDestroy {
  static id = 0;

  @Input('ngFormControlName') controlName!: string;
  @Input('ngFormControlValueMapper')
  valueMapper: ControlValueMapper | undefined;

  readonly control = new FormControl<any>({
    id: Symbol(`NgFormControlNameDirective-${NgFormControlNameDirective.id++}`),
  });

  readonly accessor: ControlAccessor;

  constructor(
    @Self()
    @Inject(NG_CONTROL_ACCESSOR)
    accessors: ControlAccessor[],
    @SkipSelf()
    @Inject(NG_CONTROL_CONTAINER_ACCESSOR)
    protected containerAccessor: ControlContainerAccessor,
    renderer: Renderer2,
    el: ElementRef,
  ) {
    super(renderer, el);

    this.accessor = resolveControlAccessor(accessors);

    this.subscriptions.push(
      concat(
        this.accessor.control.replayState(),
        this.accessor.control.events,
      ).subscribe(this.control.source),
      this.control.events.subscribe(this.accessor.control.source),
    );
  }

  ngOnChanges(_: { controlName?: SimpleChange; valueMapper?: SimpleChange }) {
    if (!this.controlName) {
      throw new Error(
        `NgFormControlNameDirective must be passed a ngFormControlName`,
      );
    }

    this.assertValidValueMapper(
      'NgFormControlNameDirective#ngFormControlValueMapper',
      this.valueMapper,
    );

    super.ngOnChanges(_);
  }

  protected validateProvidedControl(control: any): control is FormControl {
    if (!(control instanceof FormControl)) {
      throw new Error(
        'NgFormControlNameDirective must link to an instance of FormControl',
      );
    }

    return true;
  }
}
