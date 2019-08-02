import { Injectable, ElementRef, Inject, Type, Optional } from '@angular/core';
import {
  ControlValueAccessor,
  SW_DEFAULT_VALUE_ACCESSOR,
  SW_VALUE_ACCESSOR,
} from './control_value_accessor';
import { calculate, compare, Specificity } from 'specificity';

@Injectable()
export class AccessorsService {
  accessors: [string, Type<ControlValueAccessor>][];

  constructor(
    @Inject(SW_DEFAULT_VALUE_ACCESSOR)
    defaultAccessor: [string, Type<ControlValueAccessor>],
    @Optional()
    @Inject(SW_VALUE_ACCESSOR)
    accessors: [string, Type<ControlValueAccessor>][],
  ) {
    this.accessors = this.orderAccessors(accessors || []);
    this.accessors.push(defaultAccessor);
  }

  get(el: ElementRef<HTMLElement>): Type<ControlValueAccessor> | null {
    const accessor = this.accessors.find(this.comparer(el));

    return (accessor && accessor[1]) || null;
  }

  orderAccessors(accessors: [string, Type<ControlValueAccessor>][]) {
    const orderedSelectors: [
      Specificity,
      string,
      Type<ControlValueAccessor>
    ][] = [];

    accessors.forEach(([selectors, accessor]) => {
      selectors.split(',').forEach(selector => {
        try {
          orderedSelectors.push([calculate(selector)[0], selector, accessor]);
        } catch (e) {
          throw new Error(
            `AccessorsService#loadAccessors -> Error calculating ` +
              `ValueAccessor selector specificity: "${selector}"`,
          );
        }
      });
    });

    try {
      orderedSelectors.sort(([a], [b]) =>
        compare(a.specificityArray, b.specificityArray),
      );
    } catch (e) {
      throw new Error(
        `AccessorsService#loadAccessors -> ` +
          `Error comparing ValueAccessor selectors`,
      );
    }

    const map = new Map<string, Type<ControlValueAccessor>>();

    orderedSelectors.forEach(([_, selector, accessor]) => {
      if (map.has(selector)) {
        throw new Error(
          `Duplicate css selector ${selector}. Selectors must be unique.`,
        );
      }

      map.set(selector, accessor);
    });

    return Array.from(map);
  }

  comparer(
    el: ElementRef,
  ): (accessor: [string, Type<ControlValueAccessor>]) => boolean {
    return (accessor: [string, Type<ControlValueAccessor>]) =>
      el.nativeElement.matches(accessor[0]);
  }
}
