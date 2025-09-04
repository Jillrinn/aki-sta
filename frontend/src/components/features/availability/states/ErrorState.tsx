import React from 'react';
import { CommonErrorState } from '../../../common/states';
import { ErrorDetails } from '../../../../types/common';

interface ErrorStateProps {
  error: ErrorDetails;
}

const ErrorState: React.FC<ErrorStateProps> = ({ error }) => {
  return <CommonErrorState error={error} />;
};

export default ErrorState;