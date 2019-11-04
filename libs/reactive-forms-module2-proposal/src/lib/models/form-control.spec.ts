import { FormControl } from './form-control';

describe('FormControl', () => {
  describe('new', () => {
    test('', () => {
      expect(new FormControl()).toBeTruthy();
    });

    test('with args', () => {
      const control = new FormControl('', {
        id: 'my-id',
        data: 'myData',
        changed: true,
        disabled: true,
        pending: true,
        readonly: true,
        submitted: true,
        touched: true,
        validators: () => null,
      });
      expect(control).toBeTruthy();
      expect(control.value).toBe('');
      expect(control.changed).toBe(true);
      expect(control.disabled).toBe(true);
      expect(control.pending).toBe(true);
      expect(control.readonly).toBe(true);
      expect(control.submitted).toBe(true);
      expect(control.touched).toBe(true);
      expect(control.id).toBe('my-id');
      expect(control.data).toBe('myData');
      expect(typeof control.validatorStore.get(control.id)).toBe('function');
    });
  });

  describe('methods', () => {
    let control: FormControl;

    beforeEach(() => {
      control = new FormControl('');
    });

    describe('markChanged', () => {
      test('', () => {
        expect(control.changed).toBe(false);
        expect(control.dirty).toBe(false);
        control.markChanged(true);
        expect(control.changed).toBe(true);
        expect(control.dirty).toBe(true);
        control.markChanged(false);
        expect(control.changed).toBe(false);
        expect(control.dirty).toBe(false);
      });
    });

    describe('markTouched', () => {
      test('', () => {
        expect(control.touched).toBe(false);
        expect(control.dirty).toBe(false);
        control.markTouched(true);
        expect(control.touched).toBe(true);
        expect(control.dirty).toBe(true);
        control.markTouched(false);
        expect(control.touched).toBe(false);
        expect(control.dirty).toBe(false);
      });
    });

    describe('markSubmitted', () => {
      test('', () => {
        expect(control.submitted).toBe(false);
        control.markSubmitted(true);
        expect(control.submitted).toBe(true);
        control.markSubmitted(false);
        expect(control.submitted).toBe(false);
      });
    });

    describe('markReadonly', () => {
      test('', () => {
        expect(control.readonly).toBe(false);
        control.markReadonly(true);
        expect(control.readonly).toBe(true);
        control.markReadonly(false);
        expect(control.readonly).toBe(false);
      });
    });

    describe('markDisabled', () => {
      test('', () => {
        expect(control.disabled).toBe(false);
        expect(control.status).toBe('VALID');
        control.markDisabled(true);
        expect(control.disabled).toBe(true);
        expect(control.status).toBe('DISABLED');
        control.markDisabled(false);
        expect(control.disabled).toBe(false);
        expect(control.status).toBe('VALID');
      });
    });

    describe('setValue', () => {
      test('', () => {
        expect(control.value).toBe('');
        control.setValue(1);
        expect(control.value).toBe(1);
        control.setValue('two');
        expect(control.value).toBe('two');
      });
    });
  });
});
