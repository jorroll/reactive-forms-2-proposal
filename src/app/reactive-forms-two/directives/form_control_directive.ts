import {
  Input,
  OnDestroy,
  OnChanges,
  Directive,
  ElementRef,
  Injector,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { FormControl } from '../models';
import { ControlValueAccessor, AccessorsService } from '../accessors';
import { filter } from 'rxjs/operators';

@Directive({
  selector: '[ngFormControl]:not([formControl])',
  exportAs: 'ng2Form',
})
export class FormControlDirective implements OnChanges, OnDestroy {
  @Input('ngFormControl') control: FormControl;

  valueAccessor: ControlValueAccessor;

  private subscriptions: Subscription[] = [];

  constructor(
    protected el: ElementRef,
    protected accessorsService: AccessorsService,
    protected injector: Injector,
  ) {
    const ValueAccessor = this.accessorsService.get(this.el);

    if (!ValueAccessor) {
      throw new Error('Could not find valueAccessor for FormControlDirective');
    }

    this.valueAccessor = new ValueAccessor(this.injector);
  }

  ngOnChanges() {
    if (!(this.control instanceof FormControl)) {
      throw new Error(`FormControlDirective must be passed a FormControl`);
    }

    if (!this.valueAccessor) {
      throw new Error(
        `Could not find valueAccessor for FormControlDirective. ` +
          `This demo only supports basic <input> elements`,
      );
    }

    this.subscriptions.forEach(sub => sub.unsubscribe());

    const accessor = this.valueAccessor.control;

    accessor.errorsStore = new Map();
    accessor.pendingStore = new Map();
    accessor.validatorStore = new Map();
    accessor.asyncValidatorStore = new Map();

    this.control.replayState().subscribe(accessor.source);

    this.subscriptions.push(
      this.control.changes.subscribe(accessor.source),
      accessor.changes.subscribe(this.control.source),
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
