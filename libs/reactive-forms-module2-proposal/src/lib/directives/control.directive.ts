import { Input, OnDestroy, OnChanges, SimpleChange } from '@angular/core';
import { AbstractControl } from '../models';
import { ControlStateMapper, ControlValueMapper } from './interface';
import { map, filter } from 'rxjs/operators';
import { NgBaseDirective } from './base.directive';
import { ControlAccessor } from '../accessors';

export abstract class NgControlDirective<T extends AbstractControl>
  extends NgBaseDirective<T>
  implements ControlAccessor, OnChanges, OnDestroy {
  abstract providedControl: T;
  abstract stateMapper: ControlStateMapper | undefined;
  abstract valueMapper: ControlValueMapper | undefined;

  abstract readonly control: T;

  ngOnChanges(_: {
    providedControl?: SimpleChange;
    stateMapper?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    this.onChangesSubscriptions.forEach(sub => sub.unsubscribe());
    this.onChangesSubscriptions = [];

    this.control.emitEvent({
      source: this.id,
      type: 'ControlAccessor',
      value: 'Cleanup',
    });

    this.control.emitEvent({
      source: this.id,
      type: 'ControlAccessor',
      value: 'PreInit',
    });

    this.onChangesSubscriptions.push(
      this.providedControl
        .replayState()
        .pipe(map(this.fromProvidedControlMapFn()))
        .subscribe(this.control.source),
      this.providedControl.events
        .pipe(
          filter(({ type }) => type !== 'validation'),
          map(this.fromProvidedControlMapFn()),
        )
        .subscribe(this.control.source),
    );

    if (this.valueMapper && this.valueMapper.accessorValidator) {
      const validator = this.valueMapper.accessorValidator;

      this.control.setErrors(validator(this.control), {
        source: this.id,
      });

      // validate the control via a service to avoid the possibility
      // of the user somehow deleting our validator function.
      this.onChangesSubscriptions.push(
        this.control.events
          .pipe(
            filter(
              ({ type, value, source }) =>
                type === 'validation' &&
                value === 'internalEnd' &&
                source === this.control.id,
            ),
          )
          .subscribe(() => {
            this.control.setErrors(validator(this.control), {
              source: this.id,
            });
          }),
      );
    } else {
      this.control.setErrors(null, {
        source: this.id,
      });
    }

    this.onChangesSubscriptions.push(
      this.control.events
        .pipe(
          filter(({ type }) => type !== 'validation'),
          map(this.toProvidedControlMapFn()),
        )
        .subscribe(this.providedControl.source),
    );

    this.control.emitEvent({
      source: this.id,
      type: 'ControlAccessor',
      value: 'PostInit',
    });
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.control.emitEvent({
      source: this.id,
      type: 'ControlAccessor',
      value: 'Cleanup',
    });
  }
}
