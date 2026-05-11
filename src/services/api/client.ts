import { GraphQLClient } from 'graphql-request';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/graphql';

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
