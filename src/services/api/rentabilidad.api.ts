import { gql } from 'graphql-request';
import { apiClient, handleApiError } from './client';

const SYNC_DATA = gql`
  mutation SyncData($userId: String!, $data: JSONObject!) {
    syncRentabilidadData(userId: $userId, data: $data)
  }
`;

const GET_RENTABILIDAD_DATA = gql`
  query GetRentabilidadData($userId: String!) {
    rentabilidadData(userId: $userId) {
      config
      investments
      transactions
      snapshots
    }
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

function normalizeSyncPayload(data: any) {
  const transactions = Array.isArray(data?.transactions)
    ? uniqueById(data.transactions).map((transaction: any) => ({
        ...transaction,
        // Compatibilidad con el backend actual: la UI usa amountLocal/note,
        // pero MIA API persiste amount/description/type.
        type: transaction.type || 'investment_flow',
        amount: transaction.amount ?? transaction.amountLocal ?? 0,
        description: transaction.description ?? transaction.note ?? null,
      }))
    : [];

  const snapshots = Array.isArray(data?.snapshots)
    ? uniqueById(data.snapshots).map((snapshot: any) => ({
        ...snapshot,
        // Compatibilidad con el backend actual: la UI usa cutDate/valueLocal,
        // pero MIA API persiste date/totalValue.
        date: snapshot.date ?? snapshot.cutDate ?? new Date().toISOString(),
        totalValue:
          snapshot.totalValue ??
          snapshot.valueLocal ??
          (snapshot.valueUSD !== undefined && snapshot.trmCut !== undefined
            ? Number(snapshot.valueUSD) * Number(snapshot.trmCut)
            : 0),
      }))
    : [];

  const investments = Array.isArray(data?.investments)
    ? uniqueById(data.investments).map((investment: any) => ({
        ...investment,
        amount: investment.amount ?? 0,
      }))
    : [];

  return {
    ...data,
    investments,
    transactions,
    snapshots,
  };
}

function uniqueById(items: any[]) {
  const withoutId: any[] = [];
  const byId = new Map<string, any>();

  for (const item of items) {
    const id = String(item?.id ?? '').trim();
    if (!id) {
      withoutId.push(item);
      continue;
    }

    byId.set(id, item);
  }

  return [...withoutId, ...byId.values()];
}

export const rentabilidadApi = {
  async load(userId: string) {
    try {
      const response: any = await apiClient.request(GET_RENTABILIDAD_DATA, { userId });
      return response.rentabilidadData;
    } catch (error) {
      return handleApiError(error);
    }
  },

  async sync(userId: string, data: any) {
    try {
      const normalizedData = normalizeSyncPayload(data);
      const response: any = await apiClient.request(SYNC_DATA, { userId, data: normalizedData });
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
