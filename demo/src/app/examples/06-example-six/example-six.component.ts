import { Component, OnInit } from '@angular/core';
import { FormControl, StateChange } from 'reactive-forms-module2-proposal';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-example-six',
  templateUrl: './example-six.component.html',
  styleUrls: ['./example-six.component.scss'],
})
export class ExampleSixComponent implements OnInit {
  inputControl = new FormControl('start typing!');

  inputControlDefaults!: Observable<StateChange>;

  constructor() {}

  ngOnInit() {
    this.inputControlDefaults = this.inputControl.replayState();
  }

  reset() {
    // this.inputControlDefaults.subscribe(event => {
    //   console.log('reset event', event);
    // });
    this.inputControlDefaults.subscribe(this.inputControl.source);
  }
}
