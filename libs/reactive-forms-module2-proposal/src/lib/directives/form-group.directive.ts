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
import { FormGroup } from '../models';
import { filter } from 'rxjs/operators';
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
  selector: '[ngFormGroup]',
  exportAs: 'ngForm',
  providers: [
    {
      provide: NG_CONTROL_DIRECTIVE,
      useExisting: forwardRef(() => NgFormGroupDirective),
    },
    {
      provide: NG_CONTROL_CONTAINER_ACCESSOR,
      useExisting: forwardRef(() => NgFormGroupDirective),
    },
  ],
})
export class NgFormGroupDirective extends NgControlDirective<FormGroup>
  implements OnChanges {
  static id = 0;
  @Input('ngFormGroup') providedControl!: FormGroup;
  @Input('ngFormGroupValueMapper')
  valueMapper: ControlValueMapper | undefined;

  readonly control = new FormGroup<any>(
    {},
    {
      id: Symbol(`NgFormGroupDirective ${NgFormGroupDirective.id++}`),
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
      throw new Error(`NgFormGroupDirective must be passed a ngFormGroup`);
    }

    this.assertValidValueMapper(
      'NgFormGroupDirective#ngFormGroupValueMapper',
      this.valueMapper,
    );

    super.ngOnChanges(_);
  }
}
