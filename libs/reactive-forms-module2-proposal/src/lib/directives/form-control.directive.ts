import {
  OnDestroy,
  OnChanges,
  Directive,
  Inject,
  Self,
  SimpleChange,
  Renderer2,
  ElementRef,
  forwardRef,
  Input,
} from '@angular/core';
import { FormControl } from '../models';
import { NG_CONTROL_DIRECTIVE } from './base.directive';
import { resolveControlAccessor } from './util';
import { ControlAccessor, NG_CONTROL_ACCESSOR } from '../accessors';
import { NgControlDirective } from './control.directive';
import { ControlValueMapper } from './interface';
import { concat } from 'rxjs';

@Directive({
  selector: '[ngFormControl]:not([formControl])',
  exportAs: 'ngForm',
  providers: [
    {
      provide: NG_CONTROL_DIRECTIVE,
      useExisting: forwardRef(() => NgFormControlDirective),
    },
  ],
})
export class NgFormControlDirective extends NgControlDirective<FormControl>
  implements ControlAccessor, OnChanges, OnDestroy {
  static id = 0;
  @Input('ngFormControl') providedControl!: FormControl;
  @Input('ngFormControlValueMapper')
  valueMapper: ControlValueMapper | undefined;

  readonly control = new FormControl<any>(null, {
    id: Symbol(`NgFormControlDirective-${NgFormControlDirective.id++}`),
  });

  readonly accessor: ControlAccessor;

  constructor(
    @Self()
    @Inject(NG_CONTROL_ACCESSOR)
    accessors: ControlAccessor[],
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

  ngOnChanges(_: {
    providedControl?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    if (!this.providedControl) {
      throw new Error(`NgFormControlDirective must be passed a ngFormControl`);
    }

    this.assertValidValueMapper(
      'NgFormControlDirective#ngFormControlValueMapper',
      this.valueMapper,
    );

    super.ngOnChanges(_);
  }
}
