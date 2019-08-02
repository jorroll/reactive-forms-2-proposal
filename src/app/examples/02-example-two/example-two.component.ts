import { Component, OnInit } from '@angular/core';
import { FormControl } from '../../reactive-forms-two/models';

@Component({
  selector: 'app-example-two',
  templateUrl: './example-two.component.html',
  styleUrls: ['./example-two.component.scss'],
})
export class ExampleTwoComponent implements OnInit {
  controlA = new FormControl<string>();
  controlB = new FormControl<string>();

  constructor() {}

  ngOnInit() {
    this.controlA.changes.subscribe(this.controlB.source);
    this.controlB.changes.subscribe(this.controlA.source);
  }
}
