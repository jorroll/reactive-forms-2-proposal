import {
  Input,
  OnDestroy,
  OnChanges,
  Directive,
  Inject,
  Self,
  SimpleChange,
  Renderer2,
  ElementRef,
} from '@angular/core';
import { AbstractControl, FormControl } from '../models';
import { ControlStateMapper, ControlValueMapper } from './interface';
import { map, filter } from 'rxjs/operators';
import { NgBaseDirective } from './base.directive';
import { resolveControlAccessor } from './util';
import { ControlAccessor, NG_CONTROL_ACCESSOR } from '../accessors';
import { NgControlDirective } from './control.directive';

@Directive({
  selector: '[ngFormControl]:not([formControl])',
  exportAs: 'ngForm',
})
export class NgFormControlDirective extends NgControlDirective<FormControl>
  implements ControlAccessor, OnChanges, OnDestroy {
  readonly control = new FormControl();
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
      this.accessor.control.replayState().subscribe(this.control.source),
      this.accessor.control.events
        .pipe(filter(({ type }) => type !== 'validation'))
        .subscribe(this.control.source),
      this.control.events
        .pipe(filter(({ type }) => type !== 'validation'))
        .subscribe(this.accessor.control.source),
    );
  }

  ngOnChanges(_: {
    providedControl?: SimpleChange;
    stateMapper?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    if (!this.providedControl) {
      throw new Error(`NgFormControlDirective must be passed a ngFormControl`);
    }

    super.ngOnChanges(_);
  }
}
