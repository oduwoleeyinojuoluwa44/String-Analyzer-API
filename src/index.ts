import express, { Request, Response } from 'express';
import crypto from 'crypto';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory storage for strings and their properties
interface StringProperties {
  length: number;
  is_palindrome: boolean;
  unique_characters: number;
  word_count: number;
  sha256_hash: string;
  character_frequency_map: { [key: string]: number };
}

interface StoredString {
  id: string;
  value: string;
  properties: StringProperties;
  created_at: Date;
}

const stringStore: Map<string, StoredString> = new Map();

// Helper function to analyze string properties
function analyzeString(value: string): StringProperties {
  const length = value.length;

  const is_palindrome = (() => {
    const lowerValue = value.toLowerCase();
    return lowerValue === lowerValue.split('').reverse().join('');
  })();

  const unique_characters = new Set(value).size;

  const word_count = value.trim().split(/\s+/).filter(word => word.length > 0).length;

  const sha256_hash = crypto.createHash('sha256').update(value).digest('hex');

  const character_frequency_map: { [key: string]: number } = {};
  for (const char of value) {
    character_frequency_map[char] = (character_frequency_map[char] || 0) + 1;
  }

  return {
    length,
    is_palindrome,
    unique_characters,
    word_count,
    sha256_hash,
    character_frequency_map,
  };
}

// 1. Create/Analyze String Endpoint
app.post('/strings', (req: Request, res: Response) => {
  const { value } = req.body;

  if (value === undefined) {
    return res.status(400).json({ error: 'Bad Request: Missing "value" field' });
  }

  if (typeof value !== 'string') {
    return res.status(422).json({ error: 'Unprocessable Entity: Invalid data type for "value" (must be string)' });
  }

  const properties = analyzeString(value);
  const id = properties.sha256_hash;

  if (stringStore.has(id)) {
    return res.status(409).json({ error: 'Conflict: String already exists in the system' });
  }

  const newString: StoredString = {
    id,
    value,
    properties,
    created_at: new Date(),
  };
  stringStore.set(id, newString);

  res.status(201).json(newString);
});

// 4. Natural Language Filtering Endpoint
app.get('/strings/filter-by-natural-language', (req: Request, res: Response) => {
  const { query } = req.query;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Bad Request : Unable to parse natural language query' });
  }

  // Basic natural language parsing (can be expanded significantly)
  let parsedFilters: any = {};
  let interpretedQuery = { original: query, parsed_filters: {} };

  const lowerQuery = query.toLowerCase();

  if (lowerQuery.includes('single word')) {
    parsedFilters.word_count = 1;
  }
  if (lowerQuery.includes('palindromic') && !lowerQuery.includes('not palindromic')) {
    parsedFilters.is_palindrome = true;
  }
  if (lowerQuery.includes('not palindromic')) {
    parsedFilters.is_palindrome = false;
  }
  if (lowerQuery.includes('first vowel')) {
    parsedFilters.contains_character = 'a'; // Heuristic for first vowel
  }
  if (lowerQuery.includes('letter z')) {
    parsedFilters.contains_character = 'z';
  }
  if (lowerQuery.includes('longer than')) {
    const match = lowerQuery.match(/longer than (\d+) characters/);
    if (match && match[1]) {
      const minLength = parseInt(match[1], 10) + 1; // "longer than 10" means min_length = 11
      parsedFilters.min_length = minLength;
    }
  }

  // Apply parsed filters
  let filteredStrings = Array.from(stringStore.values());

  if (parsedFilters.word_count !== undefined) {
    filteredStrings = filteredStrings.filter(s => s.properties.word_count === parsedFilters.word_count);
  }
  if (parsedFilters.is_palindrome !== undefined) {
    filteredStrings = filteredStrings.filter(s => s.properties.is_palindrome === parsedFilters.is_palindrome);
  }
  if (parsedFilters.min_length !== undefined) {
    filteredStrings = filteredStrings.filter(s => s.properties.length >= parsedFilters.min_length);
  }
  if (parsedFilters.contains_character !== undefined) {
    filteredStrings = filteredStrings.filter(s => s.value.includes(parsedFilters.contains_character));
  }

  // Check for conflicting filters (basic example)
  if (parsedFilters.word_count === 1 && parsedFilters.is_palindrome === false) {
      return res.status(422).json({ error: 'Unprocessable Entity: Query parsed but resulted in conflicting filters' });
  }

  interpretedQuery.parsed_filters = parsedFilters;

  res.status(200).json({
    data: filteredStrings,
    count: filteredStrings.length,
    interpreted_query: interpretedQuery,
  });
});

// 2. Get Specific String Endpoint
app.get('/strings/:stringValue', (req: Request, res: Response) => {
  const { stringValue } = req.params;
  const hash = crypto.createHash('sha256').update(stringValue).digest('hex');
  const storedString = stringStore.get(hash);

  if (!storedString) {
    return res.status(404).json({ error: 'Not Found: String does not exist in the system' });
  }

  res.status(200).json(storedString);
});

// 3. Get All Strings with Filtering Endpoint
app.get('/strings', (req: Request, res: Response) => {
  let filteredStrings = Array.from(stringStore.values());
  const filtersApplied: { [key: string]: any } = {};

  // is_palindrome filter
  if (req.query.is_palindrome !== undefined) {
    const isPalindrome = req.query.is_palindrome === 'true';
    filteredStrings = filteredStrings.filter(s => s.properties.is_palindrome === isPalindrome);
    filtersApplied['is_palindrome'] = isPalindrome;
  }

  // min_length filter
  if (req.query.min_length !== undefined) {
    const minLength = parseInt(req.query.min_length as string, 10);
    if (isNaN(minLength)) {
      return res.status(400).json({ error: 'Bad Request: Invalid query parameter value for min_length' });
    }
    filteredStrings = filteredStrings.filter(s => s.properties.length >= minLength);
    filtersApplied['min_length'] = minLength;
  }

  // max_length filter
  if (req.query.max_length !== undefined) {
    const maxLength = parseInt(req.query.max_length as string, 10);
    if (isNaN(maxLength)) {
      return res.status(400).json({ error: 'Bad Request: Invalid query parameter value for max_length' });
    }
    filteredStrings = filteredStrings.filter(s => s.properties.length <= maxLength);
    filtersApplied['max_length'] = maxLength;
  }

  // word_count filter
  if (req.query.word_count !== undefined) {
    const wordCount = parseInt(req.query.word_count as string, 10);
    if (isNaN(wordCount)) {
      return res.status(400).json({ error: 'Bad Request: Invalid query parameter value for word_count' });
    }
    filteredStrings = filteredStrings.filter(s => s.properties.word_count === wordCount);
    filtersApplied['word_count'] = wordCount;
  }

  // contains_character filter
  if (req.query.contains_character !== undefined) {
    const containsCharacter = req.query.contains_character as string;
    if (containsCharacter.length !== 1) {
      return res.status(400).json({ error: 'Bad Request: contains_character must be a single character' });
    }
    filteredStrings = filteredStrings.filter(s => s.value.includes(containsCharacter));
    filtersApplied['contains_character'] = containsCharacter;
  }

  res.status(200).json({
    data: filteredStrings,
    count: filteredStrings.length,
    filters_applied: Object.keys(filtersApplied).length > 0 ? filtersApplied : undefined,
  });
});

// 5. Delete String Endpoint
app.delete('/strings/:stringValue', (req: Request, res: Response) => {
  const { stringValue } = req.params;
  const hash = crypto.createHash('sha256').update(stringValue).digest('hex');

  if (!stringStore.has(hash)) {
    return res.status(404).json({ error: 'Not Found: String does not exist in the system' });
  }

  stringStore.delete(hash);
  res.status(204).send(); // No Content
});

app.listen(port, () => {
  console.log(`String Analyzer API listening at http://localhost:${port}`);
});
