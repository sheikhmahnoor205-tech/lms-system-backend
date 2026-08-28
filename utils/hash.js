import crypto from 'crypto';

const SALT = 'attendflow_secure_salt_key_987654321';

export function hashPassword(password) {
  if (!password) return '';
  return crypto.createHmac('sha256', SALT).update(password).digest('hex');
}
