import {
  OnChanges,
  Directive,
  SimpleChange,
  forwardRef,
  Self,
  Inject,
  Renderer2,
  ElementRef,
  Optional,
  Input,
} from '@angular/core';
import { FormArray } from '../models';
import { NG_CONTROL_DIRECTIVE } from './base.directive';
import { resolveControlContainerAccessor } from './util';
import {
  NG_CONTROL_CONTAINER_ACCESSOR,
  ControlContainerAccessor,
  NG_CONTROL_ACCESSOR,
  ControlAccessor,
} from '../accessors';
import { NgControlDirective } from './control.directive';
import { ControlValueMapper } from './interface';
import { concat } from 'rxjs';

@Directive({
  selector: '[ngFormArray]',
  exportAs: 'ngForm',
  providers: [
    {
      provide: NG_CONTROL_DIRECTIVE,
      useExisting: forwardRef(() => NgFormArrayDirective),
    },
    {
      provide: NG_CONTROL_CONTAINER_ACCESSOR,
      useExisting: forwardRef(() => NgFormArrayDirective),
    },
  ],
})
export class NgFormArrayDirective extends NgControlDirective<FormArray>
  implements OnChanges {
  static id = 0;
  @Input('ngFormArray') providedControl!: FormArray;
  @Input('ngFormArrayValueMapper')
  valueMapper: ControlValueMapper | undefined;

  readonly control = new FormArray<any>(
    {},
    {
      id: Symbol(`NgFormArrayDirective-${NgFormArrayDirective.id++}`),
    },
  );

  readonly accessor: ControlContainerAccessor | null;

  constructor(
    @Optional()
    @Self()
    @Inject(NG_CONTROL_ACCESSOR)
    accessors: ControlAccessor[] | null,
    renderer: Renderer2,
    el: ElementRef,
  ) {
    super(renderer, el);

    this.accessor = accessors && resolveControlContainerAccessor(accessors);

    if (this.accessor) {
      this.subscriptions.push(
        concat(
          this.accessor.control.replayState(),
          this.accessor.control.events,
        ).subscribe(this.control.source),
        this.control.events.subscribe(this.accessor.control.source),
      );
    }
  }

  ngOnChanges(_: {
    providedControl?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    if (!this.providedControl) {
      throw new Error(`NgFormArrayDirective must be passed a ngFormArray`);
    }

    this.assertValidValueMapper(
      'NgFormArrayDirective#ngFormArrayValueMapper',
      this.valueMapper,
    );

    super.ngOnChanges(_);
  }
}
