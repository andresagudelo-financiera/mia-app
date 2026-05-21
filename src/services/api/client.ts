import { GraphQLClient } from 'graphql-request';

// Use a same-origin Next.js proxy by default so production HTTPS pages never call
// the backend through an insecure public http://host:4000 URL from the browser.
// graphql-request constructs URL internally, so relative paths must be resolved
// to an absolute URL in the browser.
function resolveApiUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_RENTABILIDAD_API_URL || '/api/rentabilidad/graphql';

  if (/^https?:\/\//i.test(configuredUrl)) {
    return configuredUrl;
  }

  if (typeof window !== 'undefined') {
    return new URL(configuredUrl, window.location.origin).toString();
  }

  return configuredUrl;
}

export const apiClient = new GraphQLClient(resolveApiUrl(), {
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
