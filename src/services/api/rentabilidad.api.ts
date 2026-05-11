import { gql } from 'graphql-request';
import { apiClient, handleApiError } from './client';

const SYNC_DATA = gql`
  mutation SyncData($userId: String!, $data: JSONObject!) {
    syncRentabilidadData(userId: $userId, data: $data)
  }
`;

const GET_INVESTMENTS = gql`
  query GetInvestments($userId: String!) {
    investments(userId: $userId) {
      id
      name
      pilar
      entity
      amount
      currency
      createdAt
    }
  }
`;

export const rentabilidadApi = {
  async sync(userId: string, data: any) {
    try {
      const response: any = await apiClient.request(SYNC_DATA, { userId, data });
      return response.syncRentabilidadData;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async getInvestments(userId: string) {
    try {
      const response: any = await apiClient.request(GET_INVESTMENTS, { userId });
      return response.investments;
    } catch (error) {
      return handleApiError(error);
    }
  }
};
