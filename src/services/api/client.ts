import { GraphQLClient } from 'graphql-request';

// Use a same-origin Next.js proxy by default so production HTTPS pages never call
// the backend through an insecure public http://host:4000 URL from the browser.
const API_URL = process.env.NEXT_PUBLIC_RENTABILIDAD_API_URL || '/api/rentabilidad/graphql';

export const apiClient = new GraphQLClient(API_URL, {
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for error handling
export const handleApiError = (error: any) => {
  console.error('API Error:', error);
  // Here we can add global error handling like notifications
  throw error;
};
