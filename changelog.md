# Changelog

## 2019/11/3

- Fnished FormGroup and FormArray implementation. This also resulted in some tweaks to the ControlEvent API.
- Added some form directives such as `FormGroupNameDirective` and cleaned up the directive implementations.
- Fixed potential validation race conditions.

## 2019/10/15

1. Added support for `data` state change event
2. Fixed `replayState()` so the returned events have `stateChange: true`
3. Updated `events` type so that state change is an optional property. Also updated `processEvent()` so that it never adds `stateChange: false` to an event, only `stateChange: true`. This allows the user to pass in a custom state change event. Rreviously, the system would have overwridden the custom `stateChange: true` property with `stateChange: false`, because the custom event wouldn't be recognized as a state change.

## 2019/10/14

- Initial publishing of the prototype `reactive-forms-module2-proposal`.
