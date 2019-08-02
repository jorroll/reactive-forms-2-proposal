import { Component, OnInit } from '@angular/core';
import { ValidatorFn, FormControl } from '../../reactive-forms-two';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-example-three',
  templateUrl: './example-three.component.html',
  styleUrls: ['./example-three.component.scss'],
})
export class ExampleThreeComponent implements OnInit {
  inputControl: FormControl<string>;
  dateControl: FormControl<Date | null>;

  constructor() {}

  ngOnInit() {
    // regex from https://stackoverflow.com/a/15504877/5490505
    const dateRegex = /^(?:(?:31(\/|-|\.)(?:0?[13578]|1[02]))\1|(?:(?:29|30)(\/|-|\.)(?:0?[13-9]|1[0-2])\2))(?:(?:1[6-9]|[2-9]\d)?\d{2})$|^(?:29(\/|-|\.)0?2\3(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\d|2[0-8])(\/|-|\.)(?:(?:0?[1-9])|(?:1[0-2]))\4(?:(?:1[6-9]|[2-9]\d)?\d{2})$/;

    const dateValidatorFn: ValidatorFn = control => {
      if (dateRegex.test(control.value)) {
        return null;
      }

      return {
        invalidDate: 'Invalid date format! Try M/D/YY or M/D/YYYY',
      };
    };

    this.inputControl = new FormControl({
      value: '',
      validators: dateValidatorFn,
    });

    this.dateControl = new FormControl<Date | null>({ value: null });

    this.inputControl.changes
      .pipe(
        map(state => {
          switch (state.type) {
            case 'setValue':
            case 'patchValue':
              return {
                ...state,
                value: dateRegex.test(state.value)
                  ? new Date(state.value)
                  : null,
              };
            default:
              return state;
          }
        }),
      )
      .subscribe(this.dateControl.source);

    // To simplify things, we are linking all changes to dateControl back to inputControl
    // EXCEPT for value changes to dateControl. We could also link value changes, but then
    // the example gets more complex.
    this.dateControl.changes
      .pipe(filter(state => !['setValue', 'patchValue'].includes(state.type)))
      .subscribe(this.inputControl.source);
  }
}
