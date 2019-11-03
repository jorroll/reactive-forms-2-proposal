import { FormControl } from './form-control';
import { FormGroup } from './form-group';
import { AbstractControl } from './abstract-control';

describe('FormGroup', () => {
  describe('no controls', () => {
    describe('new', () => {
      test('', () => {
        const control = new FormGroup();
        expect(control).toBeTruthy();
        expect(control.value).toEqual({});
      });

      test('with args', () => {
        const control = new FormGroup<{ [key: string]: AbstractControl }>(
          {},
          {
            id: 'my-id',
            data: 'myData',
            changed: true,
            disabled: true,
            pending: true,
            readonly: true,
            submitted: true,
            touched: true,
            validators: () => null,
          },
        );
        expect(control).toBeTruthy();
        expect(control.value).toEqual({});
        expect(control.changed).toBe(true);
        expect(control.containerChanged).toBe(true);
        expect(control.childrenChanged).toBe(false);
        expect(control.disabled).toBe(true);
        expect(control.containerDisabled).toBe(true);
        expect(control.childrenDisabled).toBe(false);
        expect(control.pending).toBe(true);
        expect(control.containerPending).toBe(true);
        expect(control.childrenPending).toBe(false);
        expect(control.readonly).toBe(true);
        expect(control.containerReadonly).toBe(true);
        expect(control.childrenReadonly).toBe(false);
        expect(control.submitted).toBe(true);
        expect(control.containerSubmitted).toBe(true);
        expect(control.childrenSubmitted).toBe(false);
        expect(control.touched).toBe(true);
        expect(control.containerTouched).toBe(true);
        expect(control.childrenTouched).toBe(false);
        expect(control.id).toBe('my-id');
        expect(control.data).toBe('myData');
        expect(typeof control.validator).toBe('function');
      });
    });

    describe('methods', () => {
      let control: FormGroup;

      beforeEach(() => {
        control = new FormGroup();
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
    });
  });

  describe('controls', () => {
    describe('new', () => {
      test('with args', () => {
        const control = new FormGroup<{ [key: string]: AbstractControl }>({
          one: new FormControl('one', {
            id: 'my-id',
            data: 'myData',
            changed: true,
            disabled: true,
            pending: true,
            readonly: true,
            submitted: true,
            touched: true,
            validators: () => null,
          }),
        });
        expect(control).toBeTruthy();
        expect(control.value).toEqual({ one: 'one' });
        expect(control.containerChanged).toBe(false);
        expect(control.childrenChanged).toBe(false);
        expect(control.changed).toBe(false);
        expect(control.containerDisabled).toBe(false);
        expect(control.childrenDisabled).toBe(true);
        expect(control.disabled).toBe(true);
        expect(control.containerPending).toBe(false);
        expect(control.childrenPending).toBe(false);
        expect(control.pending).toBe(false);
        expect(control.containerReadonly).toBe(false);
        expect(control.childrenReadonly).toBe(false);
        expect(control.readonly).toBe(false);
        expect(control.containerSubmitted).toBe(false);
        expect(control.childrenSubmitted).toBe(false);
        expect(control.submitted).toBe(false);
        expect(control.containerTouched).toBe(false);
        expect(control.childrenTouched).toBe(false);
        expect(control.touched).toBe(false);
        expect(control.data).toBeFalsy();
        expect(control.validator).toBe(null);
      });

      test('with args & disabled', () => {
        const control = new FormGroup<{ [key: string]: AbstractControl }>({
          one: new FormControl('one', {
            id: 'my-id',
            data: 'myData',
            changed: true,
            disabled: false,
            pending: true,
            readonly: true,
            submitted: true,
            touched: true,
            validators: () => null,
          }),
        });
        expect(control).toBeTruthy();
        expect(control.value).toEqual({ one: 'one' });
        expect(control.containerChanged).toBe(false);
        expect(control.childrenChanged).toBe(true);
        expect(control.changed).toBe(true);
        expect(control.containerDisabled).toBe(false);
        expect(control.childrenDisabled).toBe(false);
        expect(control.disabled).toBe(false);
        expect(control.containerPending).toBe(false);
        expect(control.childrenPending).toBe(true);
        expect(control.pending).toBe(true);
        expect(control.containerReadonly).toBe(false);
        expect(control.childrenReadonly).toBe(true);
        expect(control.readonly).toBe(true);
        expect(control.containerSubmitted).toBe(false);
        expect(control.childrenSubmitted).toBe(true);
        expect(control.submitted).toBe(true);
        expect(control.containerTouched).toBe(false);
        expect(control.childrenTouched).toBe(true);
        expect(control.touched).toBe(true);
        expect(control.data).toBeFalsy();
        expect(control.validator).toBe(null);
      });
    });

    describe('methods', () => {
      let control: FormGroup;

      beforeEach(() => {
        control = new FormGroup<{ [key: string]: AbstractControl }>({
          one: new FormControl('one'),
        });
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
    });
  });
});
