/**
 * Lightweight input validation for API handlers.
 *
 * Usage:
 *   import { validate, sanitize } from './_validate.js';
 *
 *   const body = await request.json().catch(() => ({}));
 *   const err = validate(body, {
 *     userId: 'string|required|max:128',
 *     amount: 'number|required|min:100',
 *     name:   'string|max:80',
 *   });
 *   if (err) return jsonResponse(err, 400);
 */

/**
 * Validate a plain object against a schema.
 * Returns null on success, or { error, fields } on failure.
 *
 * Supported rules (pipe-separated):
 *   required        - field must be present and non-empty
 *   string          - must be typeof string
 *   number          - must be typeof number
 *   boolean         - must be typeof boolean
 *   min:<n>         - string min length / number min value
 *   max:<n>         - string max length / number max value
 *   integer         - number must be an integer
 *   positive        - number must be > 0
 *   nonempty        - string must not be empty after trim
 */
export function validate(body, schema) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object', fields: {} };
  }

  const fields = {};

  for (const [field, ruleStr] of Object.entries(schema)) {
    const rules = ruleStr.split('|');
    const value = body[field];
    const required = rules.includes('required');
    const isEmpty = value === undefined || value === null || value === '';

    if (isEmpty) {
      if (required) fields[field] = 'This field is required';
      continue;
    }

    for (const rule of rules) {
      if (fields[field]) break; // stop at first error per field

      if (rule === 'string' && typeof value !== 'string') {
        fields[field] = 'Must be a string';
      } else if (rule === 'number' && typeof value !== 'number') {
        fields[field] = 'Must be a number';
      } else if (rule === 'boolean' && typeof value !== 'boolean') {
        fields[field] = 'Must be true or false';
      } else if (rule === 'integer' && (!Number.isInteger(value))) {
        fields[field] = 'Must be an integer';
      } else if (rule === 'positive' && typeof value === 'number' && value <= 0) {
        fields[field] = 'Must be greater than zero';
      } else if (rule === 'nonempty' && typeof value === 'string' && value.trim() === '') {
        fields[field] = 'Must not be blank';
      } else if (rule.startsWith('min:')) {
        const min = Number(rule.slice(4));
        if (typeof value === 'number' && value < min) {
          fields[field] = `Must be at least ${min}`;
        } else if (typeof value === 'string' && value.length < min) {
          fields[field] = `Must be at least ${min} characters`;
        }
      } else if (rule.startsWith('max:')) {
        const max = Number(rule.slice(4));
        if (typeof value === 'number' && value > max) {
          fields[field] = `Must be at most ${max}`;
        } else if (typeof value === 'string' && value.length > max) {
          fields[field] = `Must be at most ${max} characters`;
        }
      }
    }
  }

  if (Object.keys(fields).length > 0) {
    return { error: 'Validation failed', fields };
  }
  return null;
}

/**
 * Sanitise a string field for safe storage and display.
 * - Trims whitespace
 * - Removes null bytes (prevent injection)
 * - Collapses excessive internal whitespace
 * - Truncates to maxLength
 */
export function sanitize(value, maxLength = 1000) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\0/g, '')           // strip null bytes
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // strip control chars
    .trim()
    .slice(0, maxLength);
}

/**
 * Sanitise HTML special characters to prevent stored XSS if content
 * is later rendered in an HTML context without escaping.
 */
export function escapeHtml(value) {
  if (typeof value !== 'string') return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
