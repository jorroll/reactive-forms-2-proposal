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
import { Subscription } from 'rxjs';
import { FormControl } from 'reactive-forms-module2-proposal';

import {
  FormControlDirective,
  FormControl as OriginalFormControl,
  NgControl,
  ControlValueAccessor,
} from '@angular/forms';

import isEqual from 'lodash-es/isEqual';

export class PatchedOrigFormControl extends OriginalFormControl {
  id = Symbol('ngControl ID');

  private meta = { [this.id]: true };

  constructor(
    readonly swControl: FormControl<any, any>,
    validators?: any,
    asyncValidators?: any,
  ) {
    super(swControl.value, validators, asyncValidators);

    if (swControl.disabled) {
      this.disable({ swControl: true });
    }

    if (swControl.touched) {
      this.markAsTouched({ swControl: true });
    }

    if (swControl.changed) {
      this.markAsDirty({ swControl: true });
    }
  }

  markAsTouched(options: any = {}) {
    super.markAsTouched(options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.markTouched(true, { meta: this.meta });
  }

  markAsUntouched(options: any = {}) {
    super.markAsUntouched(options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.markTouched(false, { meta: this.meta });
  }

  markAsDirty(options: any = {}) {
    super.markAsDirty(options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.markChanged(true, { meta: this.meta });
  }

  markAsPristine(options: any = {}) {
    super.markAsPristine(options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.markChanged(false, { meta: this.meta });
  }

  disable(options: any = {}) {
    super.disable(options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.markDisabled(true, { meta: this.meta });
  }

  enable(options: any = {}) {
    super.enable(options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.markDisabled(true, { meta: this.meta });
  }

  setValue(value: any, options: any = {}) {
    super.setValue(value, options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.setValue(value, { meta: this.meta });
  }

  patchValue(value: any, options: any = {}) {
    super.patchValue(value, options);
    if (!this.swControl || options.swControl) {
      return;
    }
    this.swControl.patchValue(value, { meta: this.meta });
  }
}

@Directive({
  selector: '[ngFormControl][formControl]',
  exportAs: 'ngCompatForm',
})
export class NgCompatFormControlDirective implements OnChanges, OnDestroy {
  static id = 0;

  @Input('ngFormControl') control!: FormControl;

  protected ngControl = new PatchedOrigFormControl(new FormControl());
  protected valueAccessor: ControlValueAccessor | null;

  private id = Symbol(
    `NgCompatFormControlDirective ${NgCompatFormControlDirective.id}`,
  );
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

    const asyncValidator = async () =>
      (this.control && this.control.errors) || null;

    this.ngControl = new PatchedOrigFormControl(
      this.control,
      undefined,
      asyncValidator,
    );

    this.ngDirective.ngOnChanges({});

    this.subscriptions.forEach(sub => sub.unsubscribe());

    this.ngControl.statusChanges
      .pipe(
        filter(status => ['INVALID', 'VALID'].includes(status)),
        map(() => this.ngControl.errors),
        distinctUntilChanged(isEqual),
        // filter(errors => !errors || !errors.swControl),
        map(errors => ({
          source: this.ngControl.id,
          applied: [],
          type: 'errors',
          value: errors,
          meta: { [this.id]: true },
          ngControl: true,
        })),
      )
      .subscribe(this.control.source);

    this.subscriptions.push(
      this.control.changes
        .pipe(
          filter(
            ({ type, meta }) =>
              type === 'value' && !(meta && meta[this.ngControl.id as any]),
          ),
          map(({ value }) => value),
        )
        .subscribe(value => {
          this.ngControl.setValue(value, {
            swControl: true,
            emitEvent: false,
            emitModelToViewChange: true,
          });
        }),
    );

    this.subscriptions.push(
      this.control.changes
        .pipe(
          filter(state => {
            if (state.noEmit) {
              return false;
            }
            if (state.meta && state.meta[this.id as any]) {
              return false;
            }
            if (state.source === this.ngControl.id) {
              return false;
            }
            if (state.ngControl) {
              return false;
            }
            if (state.meta && state.meta[this.ngControl.id as any]) {
              return false;
            }

            return true;
          }),
        )
        .subscribe(state => {
          const value = state.value;
          const meta = { swControl: true } as any;

          if (state.type === 'disabled') {
            value ? this.ngControl.disable(meta) : this.ngControl.enable(meta);
          } else if (state.type === 'touched') {
            value
              ? this.ngControl.markAsTouched(meta)
              : this.ngControl.markAsUntouched(meta);
          } else if (state.type === 'changed') {
            value
              ? this.ngControl.markAsDirty(meta)
              : this.ngControl.markAsPristine(meta);
          } else if (state.type === 'errors') {
            this.ngControl.updateValueAndValidity(meta);
          }
        }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
