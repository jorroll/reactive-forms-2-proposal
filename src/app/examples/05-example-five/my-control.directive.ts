import {
  Component,
  OnInit,
  Directive,
  Input,
  Optional,
  Self,
  Inject,
  InjectionToken,
  SimpleChanges,
  SimpleChange,
  OnChanges,
} from '@angular/core';
import {
  AbstractControl,
  ValidatorFn,
  AsyncValidatorFn,
} from '../../reactive-forms-two';

export const NG_VALIDATORS_2 = new InjectionToken<ValidatorFn>(
  'NG_VALIDATORS_2',
);
export const NG_ASYNC_VALIDATORS_2 = new InjectionToken<AsyncValidatorFn>(
  'NG_ASYNC_VALIDATORS_2',
);

@Directive({
  selector: '[myControlDirective]',
})
export class MyControlDirective implements OnChanges {
  static id = 0;

  @Input('myControlDirective') control: AbstractControl;

  private id = Symbol(`myControlDirective ${MyControlDirective.id}`);

  constructor(
    @Optional()
    @Self()
    @Inject(NG_VALIDATORS_2)
    private validators: ValidatorFn[] | null,
    @Optional()
    @Self()
    @Inject(NG_ASYNC_VALIDATORS_2)
    private asyncValidators: AsyncValidatorFn[] | null,
  ) {
    MyControlDirective.id++;
  }

  ngOnChanges(changes: { control: SimpleChange }) {
    if (changes.control.previousValue) {
      // clear injected validators from the old control
      const oldControl = changes.control.previousValue;

      oldControl.source.next({
        sources: [this.id],
        type: 'setValidators',
        value: null,
      });

      oldControl.source.next({
        sources: [this.id],
        type: 'setAsyncValidators',
        value: null,
      });
    }

    // add injected validators to the new control
    this.control.source.next({
      sources: [this.id],
      type: 'setValidators',
      value: this.validators,
    });

    this.control.source.next({
      sources: [this.id],
      type: 'setAsyncValidators',
      value: this.asyncValidators,
    });
  }
}
