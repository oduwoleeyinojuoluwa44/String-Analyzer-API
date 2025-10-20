# String Analyzer API

This is a RESTful API service that analyzes strings and stores their computed properties.

## Features

For each analyzed string, the API computes and stores the following properties:
- `length`: Number of characters in the string
- `is_palindrome`: Boolean indicating if the string reads the same forwards and backwards (case-insensitive)
- `unique_characters`: Count of distinct characters in the string
- `word_count`: Number of words separated by whitespace
- `sha256_hash`: SHA-256 hash of the string for unique identification
- `character_frequency_map`: Object/dictionary mapping each character to its occurrence count

## Endpoints

### 1. Create/Analyze String
`POST /strings`
Content-Type: application/json

Request Body:
```json
{
  "value": "string to analyze"
}
```

Success Response (201 Created):
```json
{
  "id": "sha256_hash_value",
  "value": "string to analyze",
  "properties": {
    "length": 16,
    "is_palindrome": false,
    "unique_characters": 12,
    "word_count": 3,
    "sha256_hash": "abc123...",
    "character_frequency_map": {
      "s": 2,
      "t": 3,
      "r": 2
      // ... etc
    }
  },
  "created_at": "2025-08-27T10:00:00Z"
}
```

Error Responses:
- `409 Conflict`: String already exists in the system
- `400 Bad Request`: Invalid request body or missing "value" field
- `422 Unprocessable Entity`: Invalid data type for "value" (must be string)

### 2. Get Specific String
`GET /strings/{string_value}`

Success Response (200 OK):
```json
{
  "id": "sha256_hash_value",
  "value": "requested string",
  "properties": { /* same as above */ },
  "created_at": "2025-08-27T10:00:00Z"
}
```

Error Responses:
- `404 Not Found`: String does not exist in the system

### 3. Get All Strings with Filtering
`GET /strings?is_palindrome=true&min_length=5&max_length=20&word_count=2&contains_character=a`

Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "hash1",
      "value": "string1",
      "properties": { /* ... */ },
      "created_at": "2025-08-27T10:00:00Z"
    }
    // ... more strings
  ],
  "count": 15,
  "filters_applied": {
    "is_palindrome": true,
    "min_length": 5,
    "max_length": 20,
    "word_count": 2,
    "contains_character": "a"
  }
}
```

Query Parameters:
- `is_palindrome`: boolean (true/false)
- `min_length`: integer (minimum string length)
- `max_length`: integer (maximum string length)
- `word_count`: integer (exact word count)
- `contains_character`: string (single character to search for)

Error Response:
- `400 Bad Request`: Invalid query parameter values or types

### 4. Natural Language Filtering
`GET /strings/filter-by-natural-language?query=all%20single%20word%20palindromic%20strings`

Success Response (200 OK):
```json
{
  "data": [ /* array of matching strings */ ],
  "count": 3,
  "interpreted_query": {
    "original": "all single word palindromic strings",
    "parsed_filters": {
      "word_count": 1,
      "is_palindrome": true
    }
  }
}
```

Example Queries to Support:
- "all single word palindromic strings" → `word_count=1`, `is_palindrome=true`
- "strings longer than 10 characters" → `min_length=11`
- "palindromic strings that contain the first vowel" → `is_palindrome=true`, `contains_character=a` (or similar heuristic)
- "strings containing the letter z" → `contains_character=z`

Error Response:
- `400 Bad Request`: Unable to parse natural language query
- `422 Unprocessable Entity`: Query parsed but resulted in conflicting filters

### 5. Delete String
`DELETE /strings/{string_value}`

Success Response (204 No Content): (Empty response body)

Error Responses:
- `404 Not Found`: String does not exist in the system

## Setup and Running

### Prerequisites
- Node.js (v14 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository (if applicable) or navigate to the project directory.
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Application

1. Start the development server:
   ```bash
   npm run dev
   ```
   (This command assumes you have a `dev` script in your `package.json` that runs `nodemon src/index.ts`. If not, you may need to add it.)

2. The API will be running at `http://localhost:3000`.

## Dependencies

- Express.js
- TypeScript
- Nodemon (for development)
