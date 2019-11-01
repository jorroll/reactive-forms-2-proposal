import { Component, OnInit } from '@angular/core';
import { FormControl, ValidatorFn } from 'reactive-forms-module2-proposal';

@Component({
  selector: 'app-example-two',
  templateUrl: './example-two.component.html',
  styleUrls: ['./example-two.component.scss'],
})
export class ExampleTwoComponent implements OnInit {
  controlA = new FormControl('');
  controlB = new FormControl('');

  constructor() {}

  ngOnInit() {
    this.controlA.events.subscribe(this.controlB.source);
    this.controlB.events.subscribe(this.controlA.source);
  }
}
