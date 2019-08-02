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
    // regex from https://www.regextester.com/96683
    const dateRegex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

    const dateValidatorFn: ValidatorFn = control => {
      if (dateRegex.test(control.value)) {
        return null;
      }

      return {
        invalidDate: 'Invalid date format! Try YYYY/MM/DD',
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
                  ? stringToDate(state.value)
                  : null,
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
          // changes originating from the inputControl should be
          // passed back unmodified
          if (state.sources[0] === this.inputControl.id) {
            return state;
          }

          switch (state.type) {
            case 'setValue':
            case 'patchValue':
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
  const parts = text.split('-');

  const date = new Date(2010, 0, 1);

  date.setFullYear(parseInt(parts[0], 10));
  date.setMonth(parseInt(parts[1], 10) - 1);
  date.setDate(parseInt(parts[2], 10));

  return date;
}
