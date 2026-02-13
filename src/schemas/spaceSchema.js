
export const createSpaceSchema = {
  body: {
    type: 'object',
    required: ['name', 'owner'],
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 255,
        pattern: '^[a-zA-Z0-9_\\-\\s]+$'  // Solo alfanumerici, underscore, trattini e spazi
      },
      owner: {
        type: 'string',
        minLength: 1,
        maxLength: 100,
        pattern: '^[a-zA-Z0-9_\\-]+$'  // Solo alfanumerici, underscore e trattini
      }
    },
    additionalProperties: false  // Rifiuta campi extra
  }
};