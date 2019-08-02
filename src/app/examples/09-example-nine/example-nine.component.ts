import { Component, OnInit } from '@angular/core';
import { FormControl } from '../../reactive-forms-two';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-example-nine',
  templateUrl: './example-nine.component.html',
  styleUrls: ['./example-nine.component.scss'],
})
export class ExampleNineComponent implements OnInit {
  controlA = new FormControl({ value: '' });
  values$ = this.controlA.changes.pipe(
    filter(state => state.type === 'patchValue'),
  );

  constructor() {}

  ngOnInit() {}
}
