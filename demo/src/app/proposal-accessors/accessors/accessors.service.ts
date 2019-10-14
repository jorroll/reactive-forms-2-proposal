import { Injectable, ElementRef, Inject, Type, Optional } from '@angular/core';
import {
  SW_DEFAULT_CONTROL_ACCESSOR_TOKEN,
  SW_CONTROL_ACCESSOR_TOKEN,
} from './control_value_accessor';
import { calculate, compare, Specificity } from 'specificity';

import { ControlAccessor } from 'reactive-forms-module2-proposal';

@Injectable()
export class AccessorsService {
  accessors: [string, Type<ControlAccessor>][];

  constructor(
    @Inject(SW_DEFAULT_CONTROL_ACCESSOR_TOKEN)
    defaultAccessor: [string, Type<ControlAccessor>],
    @Optional()
    @Inject(SW_CONTROL_ACCESSOR_TOKEN)
    accessors: [string, Type<ControlAccessor>][],
  ) {
    this.accessors = this.orderAccessors(accessors || []);
    this.accessors.push(defaultAccessor);
  }

  get(el: ElementRef<HTMLElement>): Type<ControlAccessor> | null {
    const accessor = this.accessors.find(this.comparer(el));

    return (accessor && accessor[1]) || null;
  }

  orderAccessors(accessors: [string, Type<ControlAccessor>][]) {
    const orderedSelectors: [Specificity, string, Type<ControlAccessor>][] = [];

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

    const map = new Map<string, Type<ControlAccessor>>();

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
  ): (accessor: [string, Type<ControlAccessor>]) => boolean {
    return (accessor: [string, Type<ControlAccessor>]) =>
      el.nativeElement.matches(accessor[0]);
  }
}
