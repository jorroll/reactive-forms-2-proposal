import { Component, OnInit } from '@angular/core';
import { ValidatorFn, FormControl } from 'reactive-forms-module2-proposal';
import { filter, map } from 'rxjs/operators';

// regex from https://www.regextester.com/96683
const dateRegex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

const dateValidatorFn: ValidatorFn = control => {
  if (dateRegex.test(control.value)) {
    return null;
  }

  return {
    invalidDate: 'Invalid date format! Try YYYY-MM-DD',
  };
};

function dateToString(date: Date | null) {
  if (!date) return '';

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return `${year}-${padString(month)}-${padString(day)}`;
}

function padString(int: number) {
  return int < 10 ? `0${int}` : `${int}`;
}

function stringToDate(text: string) {
  if (!dateRegex.test(text)) return null;

  const parts = text.split('-');

  const date = new Date(2010, 0, 1);

  date.setFullYear(parseInt(parts[0], 10));
  date.setMonth(parseInt(parts[1], 10) - 1);
  date.setDate(parseInt(parts[2], 10));

  return date;
}

@Component({
  selector: 'app-example-three',
  templateUrl: './example-three.component.html',
  styleUrls: ['./example-three.component.scss'],
})
export class ExampleThreeComponent implements OnInit {
  inputControl = new FormControl('', {
    validators: dateValidatorFn,
  });

  dateControl = new FormControl<Date | null>(null);

  stringToDate = stringToDate;
  dateToString = dateToString;

  constructor() {}

  ngOnInit() {
    // To understand why this works,
    // see the github README on the StateChange API.
    // As a reminder, any StateChange originating from the `inputControl`
    // will not be re-processed by the inputControl (even if the `dateControl`
    // modifies the inputControl's StateChange before applying it).

    // example flow:
    // - inputControl is changed in the UI
    // - inputControl processes `setValue` StateChange and emits it from `inputControl#changes`
    // - The dateControl's subscription to `inputControl#changes` turns the string value
    //   into a `Date` value before processing the StateChange and re-emitting it from
    //   `dateControl#changes`.
    // - The inputControl's subscription to `dateControl#changes` turns the `Date` into a string
    //   and before then filtering out the `StateChange` because the `inputControl` has already
    //   processed it.

    this.inputControl.changes
      .pipe(
        map(state => {
          switch (state.type) {
            case 'value':
            case 'valueDefault':
              return {
                ...state,
                value: stringToDate(state.value),
              };
            default:
              return state;
          }
        }),
      )
      .subscribe(this.dateControl.source);

    this.dateControl.changes
      .pipe(
        map(state => {
          switch (state.type) {
            case 'value':
            case 'valueDefault':
              return {
                ...state,
                value: dateToString(state.value),
              };
            default:
              return state;
          }
        }),
      )
      .subscribe(this.inputControl.source);
  }
}
