import { Component, OnInit } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';

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
    this.controlA.changes.subscribe(this.controlB.source);
    this.controlB.changes.subscribe(this.controlA.source);
  }
}
