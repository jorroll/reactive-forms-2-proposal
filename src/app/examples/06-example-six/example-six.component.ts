import { Component, OnInit } from '@angular/core';
import { FormControl } from '../../reactive-forms-two';

@Component({
  selector: 'app-example-six',
  templateUrl: './example-six.component.html',
  styleUrls: ['./example-six.component.scss'],
})
export class ExampleSixComponent implements OnInit {
  inputControl = new FormControl<string>({
    value: 'start typing!',
  });

  constructor() {}

  ngOnInit() {}
}
