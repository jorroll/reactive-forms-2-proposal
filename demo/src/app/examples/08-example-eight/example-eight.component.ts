import { Component, OnInit } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';

@Component({
  selector: 'app-example-eight',
  templateUrl: './example-eight.component.html',
  styleUrls: ['./example-eight.component.scss'],
})
export class ExampleEightComponent implements OnInit {
  controlA = new FormControl<Date | null>(null);

  constructor() {}

  ngOnInit() {}
}
