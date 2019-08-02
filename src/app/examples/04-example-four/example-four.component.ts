import { Component, OnInit, Injectable } from '@angular/core';
import { FormControl } from '../../reactive-forms-two';
import { interval } from 'rxjs';
import { take, tap, debounceTime, switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-example-four',
  templateUrl: './example-four.component.html',
  styleUrls: ['./example-four.component.scss'],
})
export class ExampleFourComponent implements OnInit {
  usernameControl = new FormControl<string>();

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.usernameControl.valueChanges
      .pipe(
        tap(() => this.usernameControl.markPending('userService', true)),
        debounceTime(500),
        switchMap(value => this.userService.doesNameExist(value)),
        tap(() => this.usernameControl.markPending('userService', false)),
        map(response => ({
          sources: ['MyUserService'],
          type: 'errors',
          value: response.payload ? { userNameExists: true } : null,
        })),
      )
      .subscribe(this.usernameControl.source);
  }
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  start = Math.random() > 0.5;

  doesNameExist(_: string) {
    this.start = !this.start;

    return interval(500).pipe(
      map(() => ({ payload: this.start })),
      take(1),
    );
  }
}
