import { Component, OnInit } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-example-nine',
  templateUrl: './example-nine.component.html',
  styleUrls: ['./example-nine.component.scss'],
})
export class ExampleNineComponent implements OnInit {
  controlA = new FormControl('');
  values$ = this.controlA.events.pipe(filter(state => state.type === 'value'));

  constructor() {}

  ngOnInit() {}
}
