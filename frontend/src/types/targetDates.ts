export interface TargetDate {
  id: string;
  date: string;
  label: string;
  updatedAt: string;
}

export interface CreateTargetDateRequest {
  date: string;
  label: string;
}

export interface TargetDatesResponse {
  dates: TargetDate[];
}

export interface CreateTargetDateResponse {
  id: string;
  date: string;
  label: string;
  updatedAt: string;
}

export interface DeleteTargetDateResponse {
  success: boolean;
  message: string;
}