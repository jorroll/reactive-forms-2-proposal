import {
  Input,
  OnDestroy,
  OnChanges,
  Directive,
  ElementRef,
  Inject,
  Self,
  SimpleChange,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { filter, map, distinctUntilChanged } from 'rxjs/operators';
import { Subscription, concat } from 'rxjs';
import { FormControl, StateChange } from 'reactive-forms-module2-proposal';

import {
  FormControlDirective,
  FormControl as OriginalFormControl,
  NgControl,
  ControlValueAccessor,
} from '@angular/forms';

export class PatchedOrigFormControl extends OriginalFormControl {
  id = Symbol('ngControl ID');

  readonly swControl = new FormControl(undefined, {
    id: this.id,
  });

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

@Directive({
  selector: '[ngFormControl][formControl]',
  exportAs: 'ngCompatForm',
})
export class NgCompatFormControlDirective implements OnChanges, OnDestroy {
  static id = 0;

  @Input('ngFormControl') control!: FormControl;

  protected ngControl = new PatchedOrigFormControl();
  protected valueAccessor: ControlValueAccessor | null;

  private subscriptions: Subscription[] = [];

  constructor(
    @Self()
    @Inject(NgControl)
    protected ngDirective: FormControlDirective,
    protected el: ElementRef,
    protected cdr: ChangeDetectorRef,
  ) {
    NgCompatFormControlDirective.id++;

    const self = this;

    const orig = this.ngDirective.ngOnChanges.bind(this.ngDirective);

    let index = 0;

    this.ngDirective.ngOnChanges = (changes: SimpleChanges) => {
      const old = self.ngDirective.form;
      self.ngDirective.form = self.ngControl;
      orig({
        ...changes,
        form: new SimpleChange(old, self.ngControl, index === 0),
      });
      index++;
    };

    this.valueAccessor = this.ngDirective.valueAccessor;
  }

  ngOnChanges(changes: { control?: SimpleChange }) {
    if (!this.control) {
      throw new Error(
        `NgCompatFormControlDirective must be passed a FormControl`,
      );
    }

    if (!this.valueAccessor) {
      throw new Error(
        `NgCompatFormControlDirective could not find valueAccessor`,
      );
    }

    if (
      changes.control &&
      changes.control.previousValue === changes.control.currentValue
    ) {
      return;
    }

    this.ngControl = new PatchedOrigFormControl();

    this.ngDirective.ngOnChanges({});

    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];

    this.subscriptions.push(
      concat(this.control.replayState(), this.control.events)
        .pipe(
          filter((({ type, source }) =>
            type === 'StateChange' && source !== this.ngControl.id) as (
            val: any,
          ) => val is StateChange),
        )
        .subscribe(event => {
          event.changes.forEach((value, prop) => {
            switch (prop) {
              case 'value': {
                this.ngControl.setValue(value, {
                  swSource: event.source,
                  processed: event.processed,
                });
                break;
              }
              case 'touched': {
                if (value) {
                  this.ngControl.markAsTouched({
                    swSource: event.source,
                    processed: event.processed,
                  });
                } else {
                  this.ngControl.markAsUntouched({
                    swSource: event.source,
                    processed: event.processed,
                  });
                }
                break;
              }
              case 'changed': {
                if (value) {
                  this.ngControl.markAsDirty({
                    swSource: event.source,
                    processed: event.processed,
                  });
                } else {
                  this.ngControl.markAsPristine({
                    swSource: event.source,
                    processed: event.processed,
                  });
                }
                break;
              }
              case 'disabled': {
                if (value) {
                  this.ngControl.disable({
                    swSource: event.source,
                    processed: event.processed,
                  });
                } else {
                  this.ngControl.enable({
                    swSource: event.source,
                    processed: event.processed,
                  });
                }
                break;
              }
              case 'errorsStore': {
                this.ngControl.setErrors(this.control.errors, {
                  swSource: event.source,
                  processed: event.processed,
                });
                break;
              }
            }
          });

          this.ngControl.updateValueAndValidity();
        }),
    );

    this.subscriptions.push(
      this.ngControl.swControl.events
        .pipe(filter(({ type }) => type === 'StateChange'))
        .subscribe(this.control.source),
    );

    this.ngControl.updateValueAndValidity();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
