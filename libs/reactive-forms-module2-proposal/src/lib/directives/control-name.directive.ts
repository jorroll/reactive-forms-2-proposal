import { Input, OnDestroy, OnChanges, SimpleChange } from '@angular/core';
import { AbstractControl } from '../models';
import { ControlValueMapper, ControlAccessorEvent } from './interface';
import { map, filter } from 'rxjs/operators';
import { NgBaseDirective } from './base.directive';
import { ControlAccessor, ControlContainerAccessor } from '../accessors';
import { concat, Subscription } from 'rxjs';

export abstract class NgControlNameDirective<T extends AbstractControl>
  extends NgBaseDirective<T>
  implements ControlAccessor, OnChanges, OnDestroy {
  abstract controlName: string;

  valueMapper?: ControlValueMapper;

  abstract readonly control: T;
  protected abstract containerAccessor: ControlContainerAccessor;

  protected innerSubscriptions: Subscription[] = [];

  ngOnChanges(_: { controlName?: SimpleChange; valueMapper?: SimpleChange }) {
    if (!this.controlName) {
      throw new Error(
        `NgFormControlNameDirective must be passed a ngFormControlName`,
      );
    }

    this.cleanupInnerSubs();
    this.onChangesSubscriptions.forEach(sub => sub.unsubscribe());
    this.onChangesSubscriptions = [];

    this.onChangesSubscriptions.push(
      this.containerAccessor.control
        .observe('controls', this.controlName, { ignoreNoEmit: true })
        .subscribe((providedControl: T) => {
          this.cleanupInnerSubs();

          if (providedControl) {
            this.validateProvidedControl(providedControl);

            this.control.emitEvent<ControlAccessorEvent>({
              type: 'ControlAccessor',
              label: 'PreInit',
            });

            this.innerSubscriptions.push(
              concat(providedControl.replayState(), providedControl.events)
                .pipe(map(this.toAccessorControlMapFn()))
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
                this.control.validationEvents
                  .pipe(filter(({ label }) => label === 'InternalComplete'))
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

            this.innerSubscriptions.push(
              this.control.events
                .pipe(map(this.toProvidedControlMapFn()))
                .subscribe(providedControl.source),
            );

            this.control.emitEvent<ControlAccessorEvent>({
              type: 'ControlAccessor',
              label: 'PostInit',
            });
          }
        }),
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.cleanupInnerSubs();
  }

  protected abstract validateProvidedControl(control: any): control is T;

  protected cleanupInnerSubs() {
    this.innerSubscriptions.forEach(sub => sub.unsubscribe());

    this.control.emitEvent<ControlAccessorEvent>({
      type: 'ControlAccessor',
      label: 'Cleanup',
    });

    this.innerSubscriptions = [];
  }
}
