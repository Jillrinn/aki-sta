export interface TargetDate {
  id: string;
  date: string;
  label: string;
  isbooked: boolean;
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
  isbooked: boolean;
  updatedAt: string;
}

export interface DeleteTargetDateResponse {
  success: boolean;
  message: string;
}

export interface UpdateTargetDateRequest {
  isbooked: boolean;
}

export interface UpdateTargetDateResponse {
  id: string;
  date: string;
  label: string;
  isbooked: boolean;
  updatedAt: string;
}