export const getApiDocumentation = () => {
  return {
    "Happy Thoughts API": {
      "GET /": "API routes overview",
      "GET /thoughts": {
        "description": "Get all thoughts",
        "filters": {
          "page": "integer - pagination",
          "limit": "integer (1-100) - results per page", 
          "category": "string - filter by category",
          "sort": "string - sort by hearts, createdAt, _id, message (use - for desc)"
        }
      },
      "GET /thoughts/:id": "Get single thought by ID"
    }
  }
} 