export function validateClientContact(input: { phone?: string; email?: string }): { phone?: string; email?: string } {
  const result: { phone?: string; email?: string } = {};
  if (input.phone !== undefined) {
    if (typeof input.phone !== 'string') throw new Error('Phone must be text.');
    const phone = input.phone.trim();
    if (phone.length > 40 || (phone && !/^[+\d\s().-]+$/.test(phone))) throw new Error('Enter a valid phone number (up to 40 characters).');
    result.phone = phone;
  }
  if (input.email !== undefined) {
    if (typeof input.email !== 'string') throw new Error('Email must be text.');
    const email = input.email.trim();
    if (email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) throw new Error('Enter a valid email address.');
    result.email = email;
  }
  return result;
}
