export const createUserSchema = {
  body: {
    type: 'object',
    required: ['username', 'password'],
    additionalProperties: false,
    properties: {
      username: {
        type: 'string',
        minLength: 3,
        maxLength: 30,
        pattern: '^[a-zA-Z0-9_-]+$'  // Solo alfanumerici, underscore, trattino
      },
      password: {
        type: 'string',
        minLength: 8,   // OWASP raccomanda minimo 8 caratteri
        maxLength: 128  // Bcrypt ha limite di 72, ma per sicurezza
      }
    }
  }
};
