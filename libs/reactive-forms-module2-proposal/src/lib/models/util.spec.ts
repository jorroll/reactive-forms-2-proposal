import { isMapEqual, mapIsProperty } from './util';

describe('isMapEqual', () => {
  test('true', () => {
    const one = new Map([['one', 1]]);
    const two = new Map([['one', 1]]);

    expect(isMapEqual(one, two)).toBe(true);
  });

  test('false', () => {
    const one = new Map([['one', 1]]);
    const two = new Map([['one', 2]]);
    const three = new Map([['three', 2]]);

    expect(isMapEqual(one, two)).toBe(false);
    expect(isMapEqual(one, three)).toBe(false);
  });
});

describe('mapIsProperty', () => {
  test('true', () => {
    const one = new Map([['one', true]]);
    const two = new Map();

    expect(mapIsProperty(one)).toBe(true);
    expect(mapIsProperty(two)).toBe(true);
  });

  test('false', () => {
    const one = new Map([['one', new Map()]]);

    expect(mapIsProperty(one)).toBe(false);
  });
});
