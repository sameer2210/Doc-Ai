import { getChangedFields } from './diff-fields.util';

describe('getChangedFields', () => {
  it('should return empty object if no fields are changed', () => {
    const original = { a: 1, b: 'two' };
    const updated = { a: 1, b: 'two' };
    expect(getChangedFields(original, updated)).toEqual({});
  });

  it('should return changed fields with old and new values', () => {
    const original = { a: 1, b: 'two', c: true };
    const updated = { a: 2, c: false };
    expect(getChangedFields(original, updated)).toEqual({
      a: { old: 1, new: 2 },
      c: { old: true, new: false },
    });
  });

  it('should ignore fields not present in updated', () => {
    const original = { a: 1, b: 'two' };
    const updated = { a: 1 };
    expect(getChangedFields(original, updated)).toEqual({});
  });
});
