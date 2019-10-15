import { Component, OnInit } from '@angular/core';
import { FormControl, ControlEvent } from 'reactive-forms-module2-proposal';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-example-six',
  templateUrl: './example-six.component.html',
  styleUrls: ['./example-six.component.scss'],
})
export class ExampleSixComponent implements OnInit {
  inputControl = new FormControl('start typing!');

  inputControlDefaults!: Observable<ControlEvent<string, any>>;

  constructor() {}

  ngOnInit() {
    this.inputControlDefaults = this.inputControl.replayState();
  }

  reset() {
    this.inputControlDefaults.subscribe(this.inputControl.source);
  }
}
