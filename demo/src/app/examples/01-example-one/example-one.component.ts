import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from 'reactive-forms-module2-proposal';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-example-one',
  templateUrl: './example-one.component.html',
  styleUrls: ['./example-one.component.scss'],
})
export class ExampleOneComponent implements OnInit {
  controlA = new FormControl('');
  controlB = new FormControl('');

  constructor() {}

  ngOnInit() {
    this.controlA.events.subscribe(this.controlB.source);
  }
}
