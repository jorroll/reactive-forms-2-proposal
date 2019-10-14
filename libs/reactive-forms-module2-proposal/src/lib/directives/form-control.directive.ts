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
import { map } from 'rxjs/operators';
import { NgBaseDirective } from './base.directive';
import { resolveControlAccessor } from './util';
import { ControlAccessor, NG_CONTROL_ACCESSOR } from '../accessors';

@Directive({
  selector: '[ngFormControl]',
  exportAs: 'ngForm',
})
export class NgFormControlDirective extends NgBaseDirective<AbstractControl>
  implements ControlAccessor, OnChanges, OnDestroy {
  @Input('ngFormControl') providedControl!: AbstractControl;
  @Input('ngFormControlStateMapper')
  stateMapper?: ControlStateMapper;
  @Input('ngFormControlValueMapper')
  valueMapper?: ControlValueMapper;

  readonly control = new FormControl<any>();
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
      this.accessor.control
        .replayState({ includeDefaults: true })
        .subscribe(this.control.source),
      this.accessor.control.changes.subscribe(this.control.source),
      this.control.changes.subscribe(this.accessor.control.source),
    );
  }

  ngOnChanges(_: {
    providedControl?: SimpleChange;
    stateMapper?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    if (!this.providedControl) {
      throw new Error(`NgFormControlDirective must be passed a ngFormControl`);
    } else if (this.stateMapper && this.valueMapper) {
      throw new Error(
        `If a ngFormControlStateMapper is provided, you ` +
          `cannot also provide a ngFormControlValueMapper`,
      );
    }

    this.onChangesSubscriptions.forEach(sub => sub.unsubscribe());
    this.onChangesSubscriptions = [];

    this.control.stateChange({
      source: this.id,
      type: 'ControlAccessor',
      value: 'Cleanup',
    });

    this.control.stateChange({
      source: this.id,
      type: 'ControlAccessor',
      value: 'PreInit',
    });

    this.onChangesSubscriptions.push(
      this.providedControl
        .replayState({ includeDefaults: true })
        .pipe(map(this.fromProvidedControlMapFn()))
        .subscribe(this.control.source),
      this.providedControl.changes
        .pipe(map(this.fromProvidedControlMapFn()))
        .subscribe(this.control.source),
      this.control.changes
        .pipe(map(this.toProvidedControlMapFn()))
        .subscribe(this.providedControl.source),
    );

    this.control.stateChange({
      source: this.id,
      type: 'ControlAccessor',
      value: 'PostInit',
    });
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.control.stateChange({
      source: this.id,
      type: 'ControlAccessor',
      value: 'Cleanup',
    });
  }
}
