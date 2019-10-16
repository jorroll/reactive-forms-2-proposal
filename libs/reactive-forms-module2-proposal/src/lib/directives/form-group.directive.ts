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
  readonly control = new FormGroup();
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
        this.accessor.control.replayState().subscribe(this.control.source),
        this.accessor.control.events
          .pipe(filter(({ type }) => type !== 'validation'))
          .subscribe(this.control.source),
        this.control.events
          .pipe(filter(({ type }) => type !== 'validation'))
          .subscribe(this.accessor.control.source),
      );
    }
  }

  ngOnChanges(_: {
    providedControl?: SimpleChange;
    stateMapper?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    if (!this.providedControl) {
      throw new Error(`NgFormGroupDirective must be passed a ngFormGroup`);
    }

    super.ngOnChanges(_);
  }
}
