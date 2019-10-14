import {
  Input,
  OnDestroy,
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
import { ControlStateMapper, ControlValueMapper } from './interface';
import { map, filter } from 'rxjs/operators';
import { NgBaseDirective } from './base.directive';
import { resolveControlContainerAccessor } from './util';
import {
  NG_CONTROL_CONTAINER_ACCESSOR,
  ControlContainerAccessor,
  NG_CONTROL_ACCESSOR,
  ControlAccessor,
} from '../accessors';

@Directive({
  selector: '[ngFormGroup]',
  exportAs: 'ngForm',
  providers: [
    {
      provide: NG_CONTROL_CONTAINER_ACCESSOR,
      useExisting: forwardRef(() => NgFormGroupDirective),
    },
  ],
})
export class NgFormGroupDirective extends NgBaseDirective<FormGroup>
  implements ControlContainerAccessor<FormGroup>, OnChanges, OnDestroy {
  @Input('ngFormGroup') providedControl!: FormGroup;
  @Input('ngFormGroupStateMapper')
  stateMapper?: ControlStateMapper;
  @Input('ngFormGroupValueMapper')
  valueMapper?: ControlValueMapper;

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
        this.accessor.control
          .replayState({ includeDefaults: true })
          .subscribe(this.control.source),
        this.accessor.control.changes.subscribe(this.control.source),
        this.control.changes.subscribe(this.accessor.control.source),
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
    );

    if (this.valueMapper && this.valueMapper.accessorValidator) {
      const validator = this.valueMapper.accessorValidator;

      this.control.setValidators(validator, {
        source: this.id,
      });

      this.onChangesSubscriptions.push(
        this.control.changes
          .pipe(filter(({ type }) => type === 'validatorStore'))
          .subscribe(() => {
            this.control.setValidators(validator, {
              source: this.id,
            });
          }),
      );
    } else {
      this.control.setValidators(null, {
        source: this.id,
      });
    }

    this.onChangesSubscriptions.push(
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
