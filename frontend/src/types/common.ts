export interface ErrorDetails {
  message: string;
  statusCode?: number;
  statusText?: string;
  originalError?: string;
}