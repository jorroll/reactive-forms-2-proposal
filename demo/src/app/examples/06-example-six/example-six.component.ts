import { Component, OnInit } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';

@Component({
  selector: 'app-example-six',
  templateUrl: './example-six.component.html',
  styleUrls: ['./example-six.component.scss'],
})
export class ExampleSixComponent implements OnInit {
  inputControl = new FormControl('start typing!');

  constructor() {}

  ngOnInit() {}
}
