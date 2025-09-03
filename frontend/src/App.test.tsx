import React from 'react';
import { render, screen } from '@testing-library/react';
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

    render(<App />);

    // AppコンポーネントがAvailabilityTableをレンダリングすることを確認
    // 複数の要素がある場合はgetAllByTextを使用
    const elements = screen.getAllByText('空きスタサーチくん');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('applies Tailwind styling classes', async () => {
    (availabilityApi.getAllAvailability as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );

    const { container } = render(<App />);
    
    const appDiv = container.firstElementChild;
    expect(appDiv).toBeInTheDocument();
    expect(appDiv).toHaveClass('min-h-screen');
    expect(appDiv).toHaveClass('bg-gradient-to-br');
  });
});
