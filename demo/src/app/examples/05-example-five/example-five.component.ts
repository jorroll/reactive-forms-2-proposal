import { Component, OnInit } from '@angular/core';
import { ValidatorFn, FormControl } from 'reactive-forms-module2-proposal';
import { NG_VALIDATORS_2 } from './my-control.directive';

export const lengthValidator: ValidatorFn = control => {
  if (control.value && control.value.length > 5) {
    return {
      tooLong: 'Text is too long!',
    };
  }

  return null;
};

@Component({
  selector: 'app-validation-wrapper',
  template: `
    <ng-content></ng-content>
  `,
  providers: [
    {
      provide: NG_VALIDATORS_2,
      useValue: lengthValidator,
      multi: true,
    },
  ],
})
export class ValidationWrapperComponent {}

@Component({
  selector: 'app-example-five',
  templateUrl: './example-five.component.html',
  styleUrls: ['./example-five.component.scss'],
})
export class ExampleFiveComponent implements OnInit {
  controlA = new FormControl('');
  controlB = new FormControl('');

  constructor() {}

  ngOnInit() {}
}
