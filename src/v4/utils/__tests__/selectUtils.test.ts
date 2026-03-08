/**
 * SelectUtils Unit Tests
 *
 * Tests for sentinel select value handling utilities.
 */

import { describe, expect, it } from 'bun:test';
import {
  toSelectValue,
  fromSelectValue,
  NONE_VALUE,
  CURRENT_VALUE,
  isSentinelValue,
} from '../selectUtils';

describe('selectUtils', () => {
  describe('NONE_VALUE and CURRENT_VALUE constants', () => {
    it('should be non-empty strings', () => {
      expect(NONE_VALUE).not.toBe('');
      expect(CURRENT_VALUE).not.toBe('');
      expect(typeof NONE_VALUE).toBe('string');
      expect(typeof CURRENT_VALUE).toBe('string');
    });

    it('should be distinct values', () => {
      expect(NONE_VALUE).not.toBe(CURRENT_VALUE);
    });
  });

  describe('toSelectValue', () => {
    it('should return sentinel for undefined', () => {
      expect(toSelectValue(undefined)).toBe(NONE_VALUE);
    });

    it('should return sentinel for null', () => {
      expect(toSelectValue(null)).toBe(NONE_VALUE);
    });

    it('should return sentinel for empty string', () => {
      expect(toSelectValue('')).toBe(NONE_VALUE);
    });

    it('should return the value for non-empty strings', () => {
      expect(toSelectValue('foo')).toBe('foo');
      expect(toSelectValue('bar')).toBe('bar');
    });

    it('should use custom sentinel when provided', () => {
      expect(toSelectValue(undefined, CURRENT_VALUE)).toBe(CURRENT_VALUE);
      expect(toSelectValue('', CURRENT_VALUE)).toBe(CURRENT_VALUE);
    });

    it('should never return empty string', () => {
      // This is the critical test - Select.Item value must never be empty
      const inputs = [undefined, null, '', 'test', 'value'];
      for (const input of inputs) {
        const result = toSelectValue(input);
        expect(result).not.toBe('');
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });

  describe('fromSelectValue', () => {
    it('should return undefined for NONE_VALUE sentinel', () => {
      expect(fromSelectValue(NONE_VALUE)).toBeUndefined();
    });

    it('should return undefined for CURRENT_VALUE when specified as sentinel', () => {
      expect(fromSelectValue(CURRENT_VALUE, CURRENT_VALUE)).toBeUndefined();
    });

    it('should return the value for non-sentinel strings', () => {
      expect(fromSelectValue('foo')).toBe('foo');
      expect(fromSelectValue('bar')).toBe('bar');
    });

    it('should not match wrong sentinel', () => {
      expect(fromSelectValue(CURRENT_VALUE)).toBe(CURRENT_VALUE);
      expect(fromSelectValue(NONE_VALUE, CURRENT_VALUE)).toBe(NONE_VALUE);
    });
  });

  describe('isSentinelValue', () => {
    it('should return true for NONE_VALUE', () => {
      expect(isSentinelValue(NONE_VALUE)).toBe(true);
    });

    it('should return true for CURRENT_VALUE', () => {
      expect(isSentinelValue(CURRENT_VALUE)).toBe(true);
    });

    it('should return false for regular values', () => {
      expect(isSentinelValue('foo')).toBe(false);
      expect(isSentinelValue('bar')).toBe(false);
      expect(isSentinelValue('')).toBe(false);
    });
  });

  describe('roundtrip', () => {
    it('should preserve undefined through roundtrip', () => {
      const selectValue = toSelectValue(undefined);
      const restored = fromSelectValue(selectValue);
      expect(restored).toBeUndefined();
    });

    it('should preserve actual values through roundtrip', () => {
      const original = 'my-value';
      const selectValue = toSelectValue(original);
      const restored = fromSelectValue(selectValue);
      expect(restored).toBe(original);
    });

    it('should work with CURRENT_VALUE sentinel', () => {
      const selectValue = toSelectValue(undefined, CURRENT_VALUE);
      const restored = fromSelectValue(selectValue, CURRENT_VALUE);
      expect(restored).toBeUndefined();

      const original = 'snapshot-123';
      const selectValue2 = toSelectValue(original, CURRENT_VALUE);
      const restored2 = fromSelectValue(selectValue2, CURRENT_VALUE);
      expect(restored2).toBe(original);
    });
  });
});
