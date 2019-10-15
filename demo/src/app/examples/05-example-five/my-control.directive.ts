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
import { AbstractControl, ValidatorFn } from 'reactive-forms-module2-proposal';
import { filter } from 'rxjs/operators';
import { Subscription } from 'rxjs';

export const NG_VALIDATORS_2 = new InjectionToken<ValidatorFn>(
  'NG_VALIDATORS_2',
);

@Directive({
  selector: '[myControlDirective]',
})
export class MyControlDirective implements OnChanges {
  static id = 0;

  @Input('myControlDirective') control!: AbstractControl;

  private id = Symbol(`myControlDirective ${MyControlDirective.id}`);
  private subscriptions: Subscription[] = [];

  constructor(
    @Optional()
    @Self()
    @Inject(NG_VALIDATORS_2)
    private validators: ValidatorFn[] | null,
  ) {
    MyControlDirective.id++;
  }

  ngOnChanges(changes: { control: SimpleChange }) {
    if (changes.control.previousValue) {
      // clear injected validators from the old control
      const oldControl = changes.control.previousValue;

      oldControl.setValidators(null, {
        source: this.id,
      });
    }

    // add injected validators to the new control
    this.control.setValidators(this.validators, {
      source: this.id,
    });

    // If the `validatorStore` of the control is ever reset,
    // re-add these validators
    this.subscriptions.push(
      this.control.events
        .pipe(filter(({ type }) => type === 'validatorStore'))
        .subscribe(() => {
          this.control.setValidators(this.validators, {
            source: this.id,
          });
        }),
    );
  }

  ngOnDestroy() {
    this.clearSubscriptions();
  }

  private clearSubscriptions() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.subscriptions = [];
  }
}
