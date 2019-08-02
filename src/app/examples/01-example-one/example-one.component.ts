import { Component, OnInit } from '@angular/core';
import { FormControl } from '../../reactive-forms-two/models';

@Component({
  selector: 'app-example-one',
  templateUrl: './example-one.component.html',
  styleUrls: ['./example-one.component.scss'],
})
export class ExampleOneComponent implements OnInit {
  controlA = new FormControl<string>();
  controlB = new FormControl<string>();

  constructor() {}

  ngOnInit() {
    this.controlA.changes.subscribe(this.controlB.source);
  }
}
