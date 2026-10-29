// /project_Full-stack/Menify/backend/src/types/globalTypes.ts
export interface PageAndLimitType {
  page?: number;
  limit?: number;
}
export type OrderingType = "DESC" | "ASC";

export interface OrderingAndSearchType extends PageAndLimitType {
  search?: string | undefined;
  order?: OrderingType | undefined;
}

export interface PaginationResponse {
  total: number;
  page: number;
  limit: number;
  totalPage: number;
}
