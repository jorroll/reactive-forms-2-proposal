import { Component, OnInit, Injectable, Inject } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';
import { interval } from 'rxjs';
import { take, tap, debounceTime, switchMap, map } from 'rxjs/operators';

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

@Component({
  selector: 'app-example-four',
  templateUrl: './example-four.component.html',
  styleUrls: ['./example-four.component.scss'],
})
export class ExampleFourComponent implements OnInit {
  usernameControl = new FormControl('');

  constructor(
    // using Inject here for stackblitz compatibility
    @Inject(UserService)
    private userService: UserService,
  ) {}

  ngOnInit() {
    this.usernameControl
      .observeChanges('value', { ignoreNoEmit: true })
      .pipe(
        tap(() =>
          this.usernameControl.markPending(true, { source: 'userService' }),
        ),
        debounceTime(500),
        switchMap(value => this.userService.doesNameExist(value)),
        tap(() =>
          this.usernameControl.markPending(false, { source: 'userService' }),
        ),
      )
      .subscribe(response => {
        const errors = response.payload ? { userNameExists: true } : null;

        this.usernameControl.setErrors(errors, {
          source: 'MyUserService',
        });
      });
  }
}
