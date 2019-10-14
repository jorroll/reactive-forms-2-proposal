import { Component, OnInit } from '@angular/core';
import { ValidatorFn, FormControl } from 'reactive-forms-module2-proposal';

// regex from https://www.regextester.com/96683
const dateRegex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

const dateValidatorFn: ValidatorFn = control => {
  if (!dateRegex.test(control.value)) {
    return {
      invalidDate: 'Invalid date format! Try YYYY-MM-DD',
    };
  }

  return null;
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
export class ExampleThreeComponent {
  controlA = new FormControl<Date | null>(null);

  stringToDate = stringToDate;
  dateToString = dateToString;
  dateValidatorFn = dateValidatorFn;
}
