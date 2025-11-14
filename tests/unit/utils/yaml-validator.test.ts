/**
 * YAML validator utility tests
 */

import {
  validateYAML,
  isValidYAML,
  parseYAML,
  getNestedProperty,
  isObject,
  isNonEmptyString,
  isArray,
  normalizeToArray,
} from '../../../src/utils/yaml-validator';

describe('YAML Validator', () => {
  describe('validateYAML', () => {
    it('should validate valid YAML', () => {
      const yaml = `
name: test
value: 123
items:
  - one
  - two
`;
      const result = validateYAML(yaml);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid YAML', () => {
      const yaml = `
name: test
  invalid: indentation
`;
      const result = validateYAML(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject empty content', () => {
      const result = validateYAML('');

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('empty');
    });

    it('should parse YAML with line and column info on error', () => {
      const yaml = 'key: [unclosed';
      const result = validateYAML(yaml);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toHaveProperty('message');
    });

    it('should handle complex nested structures', () => {
      const yaml = `
root:
  level1:
    level2:
      level3: value
      list:
        - item1
        - item2
`;
      const result = validateYAML(yaml);

      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('isValidYAML', () => {
    it('should return true for valid YAML', () => {
      expect(isValidYAML('key: value')).toBe(true);
    });

    it('should return false for invalid YAML', () => {
      expect(isValidYAML('key: [unclosed')).toBe(false);
    });
  });

  describe('parseYAML', () => {
    it('should parse valid YAML and return data', () => {
      const data = parseYAML('key: value');
      expect(data).toEqual({ key: 'value' });
    });

    it('should throw error for invalid YAML', () => {
      expect(() => parseYAML('key: [unclosed')).toThrow('Invalid YAML');
    });

    it('should parse arrays', () => {
      const data = parseYAML('- one\n- two\n- three');
      expect(data).toEqual(['one', 'two', 'three']);
    });

    it('should parse nested objects', () => {
      const yaml = `
parent:
  child:
    value: 123
`;
      const data = parseYAML(yaml);
      expect(data).toEqual({
        parent: {
          child: {
            value: 123,
          },
        },
      });
    });
  });

  describe('getNestedProperty', () => {
    const obj = {
      level1: {
        level2: {
          level3: 'value',
        },
        array: [1, 2, 3],
      },
      string: 'test',
    };

    it('should get nested property', () => {
      expect(getNestedProperty(obj, 'level1.level2.level3')).toBe('value');
    });

    it('should return undefined for non-existent path', () => {
      expect(getNestedProperty(obj, 'level1.nonexistent')).toBeUndefined();
    });

    it('should return default value when path not found', () => {
      expect(getNestedProperty(obj, 'missing.path', 'default')).toBe('default');
    });

    it('should get top-level property', () => {
      expect(getNestedProperty(obj, 'string')).toBe('test');
    });

    it('should handle null object', () => {
      expect(getNestedProperty(null, 'path', 'default')).toBe('default');
    });

    it('should handle undefined object', () => {
      expect(getNestedProperty(undefined, 'path', 'default')).toBe('default');
    });
  });

  describe('isObject', () => {
    it('should return true for plain objects', () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ key: 'value' })).toBe(true);
    });

    it('should return false for arrays', () => {
      expect(isObject([])).toBe(false);
      expect(isObject([1, 2, 3])).toBe(false);
    });

    it('should return false for null', () => {
      expect(isObject(null)).toBe(false);
    });

    it('should return false for primitives', () => {
      expect(isObject('string')).toBe(false);
      expect(isObject(123)).toBe(false);
      expect(isObject(true)).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('should return true for non-empty strings', () => {
      expect(isNonEmptyString('hello')).toBe(true);
      expect(isNonEmptyString('  text  ')).toBe(true);
    });

    it('should return false for empty strings', () => {
      expect(isNonEmptyString('')).toBe(false);
      expect(isNonEmptyString('   ')).toBe(false);
    });

    it('should return false for non-strings', () => {
      expect(isNonEmptyString(123)).toBe(false);
      expect(isNonEmptyString(null)).toBe(false);
      expect(isNonEmptyString(undefined)).toBe(false);
    });
  });

  describe('isArray', () => {
    it('should return true for arrays', () => {
      expect(isArray([])).toBe(true);
      expect(isArray([1, 2, 3])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isArray({})).toBe(false);
      expect(isArray('string')).toBe(false);
      expect(isArray(null)).toBe(false);
    });
  });

  describe('normalizeToArray', () => {
    it('should convert string to array', () => {
      expect(normalizeToArray('value')).toEqual(['value']);
    });

    it('should keep arrays as arrays', () => {
      expect(normalizeToArray(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('should filter out non-strings from arrays', () => {
      expect(normalizeToArray(['a', 123, 'b', null])).toEqual(['a', 'b']);
    });

    it('should return empty array for other types', () => {
      expect(normalizeToArray(123)).toEqual([]);
      expect(normalizeToArray(null)).toEqual([]);
      expect(normalizeToArray({})).toEqual([]);
    });
  });
});
