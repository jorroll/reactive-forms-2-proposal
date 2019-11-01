import { Component, OnInit } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-example-nine',
  templateUrl: './example-nine.component.html',
  styleUrls: ['./example-nine.component.scss'],
})
export class ExampleNineComponent implements OnInit {
  controlA = new FormControl('');
  values$ = this.controlA.events.pipe(
    filter(e => e.type === 'StateChange' && e.changes.has('value')),
    map(event => {
      return {
        ...event,
        processed: event.processed.map(i =>
          typeof i === 'symbol' ? i.toString() : i,
        ),
        changes: Object.fromEntries(event.changes),
      };
    }),
  );

  constructor() {}

  ngOnInit() {}
}
