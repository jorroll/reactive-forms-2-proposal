import {
  Input,
  OnDestroy,
  OnChanges,
  Directive,
  Inject,
  Self,
  SimpleChange,
  SkipSelf,
  Renderer2,
  ElementRef,
  forwardRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { AbstractControl, FormControl } from '../models';
import { ControlValueMapper, ControlStateMapper } from './interface';
import { map, filter } from 'rxjs/operators';
import { NgBaseDirective, NG_CONTROL_DIRECTIVE } from './base.directive';
import {
  ControlAccessor,
  NG_CONTROL_ACCESSOR,
  NG_CONTROL_CONTAINER_ACCESSOR,
  ControlContainerAccessor,
} from '../accessors';
import { resolveControlAccessor } from './util';

@Directive({
  selector: '[ngFormControlName]',
  exportAs: 'ngForm',
  providers: [
    {
      provide: NG_CONTROL_DIRECTIVE,
      useExisting: forwardRef(() => NgFormControlNameDirective),
    },
  ],
})
export class NgFormControlNameDirective extends NgBaseDirective<AbstractControl>
  implements ControlAccessor, OnChanges, OnDestroy {
  @Input('ngFormControlName') controlName!: string;
  @Input('ngFormControlStateMapper')
  stateMapper?: ControlStateMapper;
  @Input('ngFormControlValueMapper')
  valueMapper?: ControlValueMapper;

  readonly control = new FormControl<any>();
  readonly accessor: ControlAccessor;

  private innerSubscriptions: Subscription[] = [];

  constructor(
    @Self()
    @Inject(NG_CONTROL_ACCESSOR)
    accessors: ControlAccessor[],
    @SkipSelf()
    @Inject(NG_CONTROL_CONTAINER_ACCESSOR)
    private containerAccessor: ControlContainerAccessor,
    renderer: Renderer2,
    el: ElementRef,
  ) {
    super(renderer, el);

    this.accessor = resolveControlAccessor(accessors);

    this.subscriptions.push(
      this.accessor.control.replayState().subscribe(this.control.source),
      this.accessor.control.events
        .pipe(filter(({ type }) => type !== 'validation'))
        .subscribe(this.control.source),
      this.control.events
        .pipe(filter(({ type }) => type !== 'validation'))
        .subscribe(this.accessor.control.source),
    );
  }

  ngOnChanges(_: {
    controlName?: SimpleChange;
    stateMapper?: SimpleChange;
    valueMapper?: SimpleChange;
  }) {
    if (!this.controlName) {
      throw new Error(
        `NgFormControlNameDirective must be passed a ngFormControlName`,
      );
    }

    this.cleanupInnerSubs();
    this.onChangesSubscriptions.forEach(sub => sub.unsubscribe());
    this.onChangesSubscriptions = [];

    this.onChangesSubscriptions.push(
      this.containerAccessor.control
        .observe('controls', this.controlName, { ignoreNoEmit: true })
        .subscribe((providedControl: AbstractControl) => {
          this.cleanupInnerSubs();

          if (providedControl) {
            this.control.emitEvent({
              source: this.id,
              type: 'ControlAccessor',
              value: 'PreInit',
            });

            this.innerSubscriptions.push(
              providedControl
                .replayState()
                .pipe(map(this.fromProvidedControlMapFn()))
                .subscribe(this.control.source),
              providedControl.events
                .pipe(
                  filter(({ type }) => type !== 'validation'),
                  map(this.fromProvidedControlMapFn()),
                )
                .subscribe(this.control.source),
            );

            if (this.valueMapper && this.valueMapper.accessorValidator) {
              const validator = this.valueMapper.accessorValidator;

              this.control.setErrors(validator(this.control), {
                source: this.id,
              });

              // validate the control via a service to avoid the possibility
              // of the user somehow deleting our validator function.
              this.onChangesSubscriptions.push(
                this.control.events
                  .pipe(
                    filter(
                      ({ type, value, source }) =>
                        type === 'validation' &&
                        value === 'internalEnd' &&
                        source === this.control.id,
                    ),
                  )
                  .subscribe(() => {
                    this.control.setErrors(validator(this.control), {
                      source: this.id,
                    });
                  }),
              );
            } else {
              this.control.setErrors(null, {
                source: this.id,
              });
            }

            this.innerSubscriptions.push(
              this.control.events
                .pipe(
                  filter(({ type }) => type !== 'validation'),
                  map(this.toProvidedControlMapFn()),
                )
                .subscribe(providedControl.source),
            );

            this.control.emitEvent({
              source: this.id,
              type: 'ControlAccessor',
              value: 'PostInit',
            });
          }
        }),
    );
  }

  ngOnDestroy() {
    super.ngOnDestroy();

    this.cleanupInnerSubs();
  }

  private cleanupInnerSubs() {
    this.innerSubscriptions.forEach(sub => sub.unsubscribe());

    this.control.emitEvent({
      source: this.id,
      type: 'ControlAccessor',
      value: 'Cleanup',
    });

    this.innerSubscriptions = [];
  }
}
