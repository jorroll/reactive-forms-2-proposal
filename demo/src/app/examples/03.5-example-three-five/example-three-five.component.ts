import { Component, OnInit } from '@angular/core';
import { ValidatorFn, FormControl } from 'reactive-forms-module2-proposal';
import { map } from 'rxjs/operators';

// regex from https://www.regextester.com/96683
const dateRegex = /^([12]\d{3}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01]))$/;

const stringValidatorFn: ValidatorFn = control => {
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

const dateValidatorFn: ValidatorFn = control => {
  if (control.value) {
    return null;
  }

  return {
    invalidDate: 'Invalid date format!',
  };
};

@Component({
  selector: 'app-example-three-five',
  templateUrl: './example-three-five.component.html',
  styleUrls: ['./example-three-five.component.scss'],
})
export class ExampleThreeFiveComponent implements OnInit {
  inputControl = new FormControl('', {
    validators: stringValidatorFn,
  });

  dateControl = new FormControl<Date | null>(null);

  stringToDate = stringToDate;
  dateToString = dateToString;

  constructor() {}

  ngOnInit() {
    // To understand why this works,
    // see the github README on the ControlEvent API.
    // As a reminder, any ControlEvent originating from the `inputControl`
    // will not be re-processed by the inputControl (even if the `dateControl`
    // modifies the inputControl's ControlEvent before applying it).

    // example flow:
    // - inputControl is changed in the UI
    // - inputControl processes the value change ControlEvent and emits it from `inputControl#events`
    // - The dateControl's subscription to `inputControl#events` turns the string value
    //   into a `Date` value before processing the ControlEvent and re-emitting it from
    //   `dateControl#events`.
    // - The inputControl's subscription to `dateControl#events` turns the `Date` into a string
    //   before then filtering out the `ControlEvent` because the `inputControl` has already
    //   processed it.

    // Important not to sync all the inputControl's state as the `dateControl`
    // will not play nice with the inputControl's validatorFn (which expects
    // strings)
    this.inputControl.events
      .pipe(
        map(event => {
          if (event.type === 'StateChange' && event.changes.has('value')) {
            const changes = new Map(event.changes);

            changes.set('value', stringToDate(event.changes.get('value')));

            return {
              ...event,
              changes,
            };
          }

          return event;
        }),
      )
      .subscribe(this.dateControl.source);

    this.dateControl.events
      .pipe(
        map(event => {
          if (event.type === 'StateChange' && event.changes.has('value')) {
            const changes = new Map(event.changes);

            changes.set('value', dateToString(event.changes.get('value')));

            return {
              ...event,
              changes,
            };
          }

          return event;
        }),
      )
      .subscribe(this.inputControl.source);
  }

  setDate() {
    this.dateControl.setValue(new Date());
  }
}
