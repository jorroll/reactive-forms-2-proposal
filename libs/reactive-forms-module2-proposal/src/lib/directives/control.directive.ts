import { OnDestroy, OnChanges, SimpleChange } from '@angular/core';
import { AbstractControl } from '../models';
import { ControlValueMapper, ControlAccessorEvent } from './interface';
import { map, filter } from 'rxjs/operators';
import { NgBaseDirective } from './base.directive';
import { ControlAccessor } from '../accessors';
import { concat } from 'rxjs';

export abstract class NgControlDirective<T extends AbstractControl>
  extends NgBaseDirective<T>
  implements ControlAccessor, OnChanges, OnDestroy {
  abstract providedControl: T;

  valueMapper?: ControlValueMapper;

  abstract readonly control: T;

  ngOnChanges(_: {
    providedControl?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    this.onChangesSubscriptions.forEach(sub => sub.unsubscribe());
    this.onChangesSubscriptions = [];

    this.control.emitEvent<ControlAccessorEvent>({
      type: 'ControlAccessor',
      label: 'Cleanup',
    });

    this.control.emitEvent<ControlAccessorEvent>({
      type: 'ControlAccessor',
      label: 'PreInit',
    });

    this.onChangesSubscriptions.push(
      concat(this.providedControl.replayState(), this.providedControl.events)
        .pipe(map(this.toAccessorControlMapFn()))
        .subscribe(this.control.source),
    );

    if (this.valueMapper && this.valueMapper.accessorValidator) {
      const validator = this.valueMapper.accessorValidator;

      this.control.setErrors(validator(this.control), {
        source: this.accessorValidatorId,
      });

      // validate the control via a service to avoid the possibility
      // of the user somehow deleting our validator function.
      this.onChangesSubscriptions.push(
        this.control.validationEvents
          .pipe(filter(({ label }) => label === 'InternalComplete'))
          .subscribe(() => {
            this.control.setErrors(validator(this.control), {
              source: this.accessorValidatorId,
            });
          }),
      );
    } else {
      this.control.setErrors(null, {
        source: this.accessorValidatorId,
      });
    }

    this.onChangesSubscriptions.push(
      this.control.events
        .pipe(map(this.toProvidedControlMapFn()))
        .subscribe(this.providedControl.source),
    );

    this.control.emitEvent<ControlAccessorEvent>({
      type: 'ControlAccessor',
      label: 'PostInit',
    });
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.control.emitEvent<ControlAccessorEvent>({
      type: 'ControlAccessor',
      label: 'Cleanup',
    });
  }
}
