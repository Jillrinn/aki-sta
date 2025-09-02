import React from 'react';
import { render, screen, act } from '@testing-library/react';
import App from './App';
import { availabilityApi } from './services/api';

jest.mock('./services/api');

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the AvailabilityTable component', async () => {
    const mockData = {
      '2025-11-15': [
        {
          facilityName: 'Test Facility',
          timeSlots: { 
            'morning': 'available',
            'afternoon': 'available',
            'evening': 'available'
          },
          lastUpdated: '2025-08-20T10:00:00Z',
        },
      ],
    };

    (availabilityApi.getAllAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<App />);
    });

    // AppコンポーネントがAvailabilityTableをレンダリングすることを確認
    expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
  });

  it('applies Tailwind styling classes', () => {
    (availabilityApi.getAllAvailability as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );

    const { container } = render(<App />);
    const appDiv = container.querySelector('.min-h-screen');
    expect(appDiv).toBeInTheDocument();
    expect(appDiv).toHaveClass('bg-gradient-to-br');
  });
});
