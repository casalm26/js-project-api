const SORT_FIELDS = ['hearts', 'createdAt', 'updatedAt', 'category', '_id', 'message']
const MAX_LIMIT = 100

const createEndpointDoc = (description, options = {}) => ({
  description,
  ...options,
})

const createFilterDoc = (type, description, validation = null) => ({
  type,
  description,
  ...(validation && { validation }),
})

export const getApiDocumentation = () => ({
  'Happy Thoughts API': {
    'GET /': createEndpointDoc('API routes overview'),
    
    'GET /thoughts': createEndpointDoc('Get all thoughts with filtering and pagination', {
      filters: {
        page: createFilterDoc('integer', 'Page number for pagination', 'minimum: 1'),
        limit: createFilterDoc('integer', `Results per page`, `1-${MAX_LIMIT}`),
        category: createFilterDoc('string', 'Filter thoughts by category'),
        minHearts: createFilterDoc('integer', 'Filter thoughts with minimum hearts', 'minimum: 0'),
        newerThan: createFilterDoc('string', 'Filter thoughts newer than date', 'ISO 8601 format'),
        sort: createFilterDoc('string', `Sort by: ${SORT_FIELDS.join(', ')}`, 'use - prefix for descending'),
      },
    }),
    
    'GET /thoughts/:id': createEndpointDoc('Get single thought by ID', {
      parameters: {
        id: createFilterDoc('string', 'Thought ID', 'MongoDB ObjectId format'),
      },
    }),
    
    'POST /auth/signup': createEndpointDoc('Create new user account', {
      body: {
        email: createFilterDoc('string', 'User email address', 'valid email format'),
        password: createFilterDoc('string', 'User password', 'minimum 8 characters'),
        name: createFilterDoc('string', 'User display name'),
      },
    }),
    
    'POST /auth/login': createEndpointDoc('Authenticate user', {
      body: {
        email: createFilterDoc('string', 'User email address'),
        password: createFilterDoc('string', 'User password'),
      },
    }),
  },
})
