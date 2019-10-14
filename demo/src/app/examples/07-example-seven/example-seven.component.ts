import { Component, OnInit } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';

@Component({
  selector: 'app-example-seven',
  templateUrl: './example-seven.component.html',
  styleUrls: ['./example-seven.component.scss'],
})
export class ExampleSevenComponent implements OnInit {
  controlA = new FormControl<Date | null>(null);

  constructor() {}

  ngOnInit() {}
}
