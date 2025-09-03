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
    // 複数の要素がある場合はgetAllByTextを使用
    const elements = screen.getAllByText('空きスタサーチくん');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('applies Tailwind styling classes', async () => {
    (availabilityApi.getAllAvailability as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );

    let container: HTMLElement;
    await act(async () => {
      const result = render(<App />);
      container = result.container;
    });
    
    const appDiv = container!.querySelector('.min-h-screen');
    expect(appDiv).toBeInTheDocument();
    expect(appDiv).toHaveClass('bg-gradient-to-br');
  });
});
