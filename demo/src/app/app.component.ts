import { Component, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  host: {
    class: 'mat-typography',
  },
  encapsulation: ViewEncapsulation.None,
})
export class AppComponent {
  title = 'demo';
}
