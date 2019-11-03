import { Component, OnInit, Injectable, Inject } from '@angular/core';
import { FormControl } from 'reactive-forms-module2-proposal';
import { interval, of, Observable, NEVER } from 'rxjs';
import {
  take,
  tap,
  debounceTime,
  switchMap,
  map,
  filter,
  pairwise,
} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  start = Math.random() > 0.5;

  doesNameExist(_: string) {
    this.start = !this.start;
    const payload = this.start;

    return interval(500).pipe(
      map(() => ({ payload })),
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

  /**
   * # Overview
   *
   * So the easy way of doing async validation is to simply observe
   * a control's `value` changes and then begin async validation.
   *
   * For example:
   *
   * ```ts
   * this.usernameControl
   *  .observeChanges('value', { ignoreNoEmit: true })
   *  .pipe(
   *     tap(() => {
   *       this.usernameControl.markPending(true, {
   *         source: 'userService',
   *       });
   *     }),
   *     debounceTime(500),
   *     switchMap(value => this.userService.doesNameExist(value)),
   *     tap(() =>
   *       this.usernameControl.markPending(false, { source: 'userService' }),
   *     ),
   *   )
   *   .subscribe(response => {
   *     const errors = response.payload ? { userNameExists: true } : null;
   *     this.usernameControl.setErrors(errors, {
   *       source: 'userService',
   *     });
   *   });
   * ```
   *
   * While this approach may be fine for most use cases, it has some
   * limitations:
   *
   * 1. Async validation is being performed even if the synchronous
   *    validators have found the value to be invalid.
   * 2. The control's `value` state change event is being emitted before
   *    any async validation services have had a chance to react.
   *
   *    This means that it's possible something subscribed to `value`
   *    state changes could:
   *
   *      1. Receive the state change event.
   *      2. Check if the control is valid and see that it is.
   *      3. Check if the control is pending and see that it isn't.
   *
   *    All before any async services have had a chance to mark the control
   *    as pending or invalid.
   *
   * If you want to ensure that any `value` state change events
   * are only emitted after async services have had a chance to react
   * (usually by synchronously marking the control as `pending`), then we need
   * to subscribe to the "validation end" lifecycle event.
   */

  ngOnInit() {
    this.usernameControl.validationEvents
      .pipe(
        // Wait for the control to complete its synchronous validation.
        filter(event => event.label === 'End'),
        tap(() => {
          // Discard any existing errors set by the userService as they are
          // no longer applicable.
          this.usernameControl.setErrors(null, {
            source: `userService`,
          });

          // If the control is already marked invalid, we're going to skip the async
          // validation check so don't bother to mark pending.
          this.usernameControl.markPending(
            this.usernameControl.value !== '' && this.usernameControl.valid,
            {
              source: `userService`,
            },
          );
        }),
        // By running validation inside a `switchMap` + `interval()` (instead
        // of `debounceTime()`), we ensure that an in-progress async validation
        // check is discarded if the user starts typing again.
        switchMap(() => {
          // If the control is already invalid we don't need to do anything.
          if (
            this.usernameControl.value === '' ||
            this.usernameControl.invalid
          ) {
            return NEVER;
          }

          // Else run validation.
          return interval(500).pipe(
            take(1),
            switchMap(() =>
              this.userService.doesNameExist(this.usernameControl.value),
            ),
          );
        }),
      )
      .subscribe(response => {
        this.usernameControl.markPending(false, {
          source: `userService`,
        });

        const errors = response.payload ? { userNameExists: true } : null;

        this.usernameControl.setErrors(errors, {
          source: `userService`,
        });
      });
  }
}
