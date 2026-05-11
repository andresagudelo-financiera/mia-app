import { gql } from 'graphql-request';
import { apiClient, handleApiError } from './client';

const REGISTER_USER = gql`
  mutation RegisterUser($name: String!, $email: String!, $phone: String, $baseCurrency: String) {
    registerUser(name: $name, email: $email, phone: $phone, baseCurrency: $baseCurrency) {
      id
      name
      email
      baseCurrency
      registeredAt
      hasCompletedOnboarding
    }
  }
`;

const GET_USER = gql`
  query GetUser($email: String!) {
    user(email: $email) {
      id
      name
      email
      baseCurrency
      registeredAt
      hasCompletedOnboarding
      accesses {
        toolName
        status
        accessType
        expiresAt
      }
    }
  }
`;

export const userApi = {
  async register(data: { name: string; email: string; phone?: string; baseCurrency?: string }) {
    try {
      const response: any = await apiClient.request(REGISTER_USER, data);
      return response.registerUser;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getUser(email: string) {
    try {
      const response: any = await apiClient.request(GET_USER, { email });
      return response.user;
    } catch (error) {
      return handleApiError(error);
    }
  }
};
