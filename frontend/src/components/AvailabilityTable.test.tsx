import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvailabilityTable from './AvailabilityTable';
import { availabilityApi } from '../services/api';

jest.mock('../services/api');

describe('AvailabilityTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    (availabilityApi.getAvailability as jest.Mock).mockReturnValue(
      new Promise(() => {})
    );
    
    render(<AvailabilityTable />);
    expect(screen.getByText('データを読み込み中...')).toBeInTheDocument();
  });

  it('renders availability data correctly', async () => {
    const mockData = {
      date: '2025-11-15',
      facilities: [
        {
          facilityName: 'Ensemble Studio 本郷',
          timeSlots: { '13-17': 'available' },
          lastUpdated: '2025-08-20T10:00:00Z',
        },
        {
          facilityName: '音楽スタジオ 渋谷',
          timeSlots: { '13-17': 'booked' },
          lastUpdated: '2025-08-20T10:15:00Z',
        },
      ],
      dataSource: 'dummy' as const,
    };

    (availabilityApi.getAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('空きスタサーチくん')).toBeInTheDocument();
    });

    expect(screen.getByText('施設空き状況 - 2025-11-15')).toBeInTheDocument();
    expect(screen.getByText('Ensemble Studio 本郷')).toBeInTheDocument();
    expect(screen.getByText('音楽スタジオ 渋谷')).toBeInTheDocument();
    expect(screen.getByText('更新日時')).toBeInTheDocument();
    
    const availableStatuses = screen.getAllByText('○');
    const bookedStatuses = screen.getAllByText('×');
    
    expect(availableStatuses.length).toBeGreaterThan(0);
    expect(bookedStatuses.length).toBeGreaterThan(0);
    
    // 更新日時が表示されていることを確認（テストデータの日時）
    expect(screen.getByText('08/20 19:00')).toBeInTheDocument();
  });

  it('renders error state when API fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    (availabilityApi.getAvailability as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('データの取得に失敗しました')).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('renders no data state when facilities are empty', async () => {
    const mockData = {
      date: '2025-11-15',
      facilities: [],
      dataSource: 'dummy' as const,
    };

    (availabilityApi.getAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      expect(screen.getByText('データがありません')).toBeInTheDocument();
    });
  });

  it('displays correct status symbols', async () => {
    const mockData = {
      date: '2025-11-15',
      facilities: [
        {
          facilityName: 'Test Facility 1',
          timeSlots: { '13-17': 'available' },
          lastUpdated: '2025-08-20T10:00:00Z',
        },
        {
          facilityName: 'Test Facility 2',
          timeSlots: { '13-17': 'booked' },
          lastUpdated: '2025-08-20T10:30:00Z',
        },
      ],
      dataSource: 'dummy' as const,
    };

    (availabilityApi.getAvailability as jest.Mock).mockResolvedValue(mockData);

    await act(async () => {
      render(<AvailabilityTable />);
    });

    await waitFor(() => {
      const availableStatuses = screen.getAllByText('○');
      const bookedStatuses = screen.getAllByText('×');
      
      expect(availableStatuses.length).toBeGreaterThan(0);
      expect(bookedStatuses.length).toBeGreaterThan(0);
    });
  });
});