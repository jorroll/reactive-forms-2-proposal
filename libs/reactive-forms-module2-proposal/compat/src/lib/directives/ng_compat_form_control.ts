import { FormControl as OriginalFormControl } from '@angular/forms';
import {
  FormControl,
  StateChange,
  ValidationErrors,
} from 'reactive-forms-module2-proposal';
import { filter } from 'rxjs/operators';

export class NgCompatFormControl extends OriginalFormControl {
  get id() {
    return this.swControl.id;
  }

  constructor(readonly swControl: FormControl) {
    super();

    this.swControl.events
      .pipe(
        filter(
          ({ type, source }) => type === 'StateChange' && source !== this.id,
        ),
      )
      .subscribe(event => {
        (event as StateChange).changes.forEach((value, prop) => {
          switch (prop) {
            case 'value': {
              this.setValue(value, {
                swSource: event.source,
                processed: event.processed,
              });
              break;
            }
            case 'touched': {
              if (value) {
                this.markAsTouched({
                  swSource: event.source,
                  processed: event.processed,
                });
              } else {
                this.markAsUntouched({
                  swSource: event.source,
                  processed: event.processed,
                });
              }
              break;
            }
            case 'changed': {
              if (value) {
                this.markAsDirty({
                  swSource: event.source,
                  processed: event.processed,
                });
              } else {
                this.markAsPristine({
                  swSource: event.source,
                  processed: event.processed,
                });
              }
              break;
            }
            case 'disabled': {
              if (value) {
                this.disable({
                  swSource: event.source,
                  processed: event.processed,
                });
              } else {
                this.enable({
                  swSource: event.source,
                  processed: event.processed,
                });
              }
              break;
            }
            case 'errorsStore': {
              const errors = Array.from(value as Map<
                string,
                ValidationErrors | null
              >).reduce(
                (prev, [, curr]) => {
                  return {
                    ...prev,
                    ...curr,
                  };
                },
                {} as ValidationErrors,
              );

              this.setErrors(Object.keys(errors).length === 0 ? null : errors, {
                swSource: event.source,
                processed: event.processed,
              });
              break;
            }
          }
        });

        this.updateValueAndValidity();
      });
  }

  private options(op: any) {
    return { source: op.swSource || this.id, processed: op.processed };
  }

  markAsTouched(options: any = {}) {
    super.markAsTouched(options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.markTouched(true, this.options(options));
  }

  markAsUntouched(options: any = {}) {
    super.markAsUntouched(options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.markTouched(false, this.options(options));
  }

  markAsDirty(options: any = {}) {
    super.markAsDirty(options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.markChanged(true, this.options(options));
  }

  markAsPristine(options: any = {}) {
    super.markAsPristine(options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.markChanged(false, this.options(options));
  }

  disable(options: any = {}) {
    super.disable(options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.markDisabled(true, this.options(options));
  }

  enable(options: any = {}) {
    super.enable(options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.markDisabled(true, this.options(options));
  }

  setValue(value: any, options: any = {}) {
    super.setValue(value, options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.setValue(value, this.options(options));
  }

  patchValue(value: any, options: any = {}) {
    super.patchValue(value, options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.patchValue(value, this.options(options));
    this.swControl.setErrors(this.errors, this.options(options));
    this.swControl.markPending(false, this.options(options));
  }

  setErrors(value: any, options: any = {}) {
    super.setErrors(value, options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.setErrors(value, this.options(options));
  }

  markAsPending(options: any = {}) {
    super.markAsPending(options);
    if (!this.swControl || options.source === this.id) {
      return;
    }
    this.swControl.markPending(true, this.options(options));
  }

  get invalid() {
    return this.swControl.invalid;
  }

  get valid() {
    return this.swControl.valid;
  }
}
