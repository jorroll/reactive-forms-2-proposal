import {
  ControlAccessor,
  DefaultValueAccessor,
  ControlContainerAccessor,
} from '../accessors';
import { ControlContainer, PartialControlEvent, StateChange } from '../models';

const STD_ACCESSORS: ControlAccessor[] = [];

export function resolveControlAccessor(accessors: ControlAccessor[]) {
  if (accessors.length > 3) {
    throw new Error(
      'Too many accessors found. Can only resolve a single custom accessor',
    );
  } else if (accessors.length === 3) {
    const customAccessor = accessors.find(
      acc =>
        !STD_ACCESSORS.includes(acc) && !(acc instanceof DefaultValueAccessor),
    );

    if (!customAccessor) {
      throw new Error(
        'Error resolving accessor. Expected to find custom accessor',
      );
    }

    return customAccessor;
  } else if (accessors.length === 2) {
    const customAccessor = accessors.find(
      acc =>
        !STD_ACCESSORS.includes(acc) && !(acc instanceof DefaultValueAccessor),
    );

    if (customAccessor) {
      return customAccessor;
    }

    const stdAccessor = accessors.find(acc => STD_ACCESSORS.includes(acc));

    if (!stdAccessor) {
      throw new Error(
        'Error resolving accessor. Expected to find std accessor',
      );
    }

    return stdAccessor;
  } else if (accessors.length === 1) {
    return accessors[0];
  } else {
    throw new Error('Could not find control accessor');
  }
}

export function resolveControlContainerAccessor(
  accessors: ControlAccessor[],
): ControlContainerAccessor {
  const containerAccessors = accessors.filter(acc =>
    ControlContainer.isControlContainer(acc),
  );

  if (containerAccessors.length > 1) {
    console.error('containerAccessors', containerAccessors);
    throw new Error(
      `Error resolving container accessor. Expected ` +
        `to find 0 or 1 but found ${containerAccessors.length}`,
    );
  } else if (containerAccessors.length === 1) {
    return accessors[0] as ControlContainerAccessor;
  } else {
    throw new Error('Could not find control container accessor');
  }
}

export function isValueStateChange(
  event: PartialControlEvent,
): event is StateChange {
  return (
    event.type === 'StateChange' && (event as StateChange).changes.has('value')
  );
}
