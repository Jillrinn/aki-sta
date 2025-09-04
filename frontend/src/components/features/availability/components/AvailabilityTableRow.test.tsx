import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AvailabilityTableRow from './AvailabilityTableRow';
import { Facility } from '../../../../types/availability';
import * as availabilityUtils from '../../../../utils/availabilityUtils';

// Mock the utility function
jest.mock('../../../../utils/availabilityUtils', () => ({
  openBookingUrl: jest.fn()
}));

describe('AvailabilityTableRow', () => {
  const mockFacility: Facility = {
    centerName: 'あんさんぶるスタジオ',
    facilityName: 'あんさんぶるStudio和(本郷)',
    roomName: '練習室',
    timeSlots: {
      morning: 'available' as const,
      afternoon: 'booked' as const,
      evening: 'lottery' as const
    },
    lastUpdated: '2024-01-20T10:00:00Z'
  };

  const mockFormatUpdateTime = jest.fn((date) => '08/20 10:00');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render facility information correctly', () => {
    render(
      <table>
        <tbody>
          <AvailabilityTableRow 
            facility={mockFacility} 
            formatUpdateTime={mockFormatUpdateTime} 
          />
        </tbody>
      </table>
    );

    expect(screen.getByText('あんさんぶるStudio和(本郷)')).toBeInTheDocument();
    expect(screen.getByText('- 練習室')).toBeInTheDocument();
    expect(screen.getByText('08/20 10:00')).toBeInTheDocument();
  });

  it('should render status badges for each time slot', () => {
    render(
      <table>
        <tbody>
          <AvailabilityTableRow 
            facility={mockFacility} 
            formatUpdateTime={mockFormatUpdateTime} 
          />
        </tbody>
      </table>
    );

    // 各時間帯のバッジが表示されていることを確認
    const badges = screen.getAllByRole('img');
    expect(badges).toHaveLength(3);
    expect(badges[0]).toHaveTextContent('○'); // morning: available
    expect(badges[1]).toHaveTextContent('×'); // afternoon: booked
    expect(badges[2]).toHaveTextContent('△'); // evening: lottery
  });

  it('should make all badges clickable', () => {
    render(
      <table>
        <tbody>
          <AvailabilityTableRow 
            facility={mockFacility} 
            formatUpdateTime={mockFormatUpdateTime} 
          />
        </tbody>
      </table>
    );

    const badges = screen.getAllByRole('img');
    badges.forEach(badge => {
      expect(badge).toHaveClass('cursor-pointer');
      expect(badge).toHaveClass('hover:opacity-80');
    });
  });

  it('should call openBookingUrl when any badge is clicked', () => {
    render(
      <table>
        <tbody>
          <AvailabilityTableRow 
            facility={mockFacility} 
            formatUpdateTime={mockFormatUpdateTime} 
          />
        </tbody>
      </table>
    );

    const badges = screen.getAllByRole('img');
    
    // 各バッジをクリック
    badges.forEach(badge => {
      fireEvent.click(badge);
    });

    // 各バッジのクリックでopenBookingUrlが呼ばれることを確認
    expect(availabilityUtils.openBookingUrl).toHaveBeenCalledTimes(3);
    expect(availabilityUtils.openBookingUrl).toHaveBeenCalledWith('あんさんぶるスタジオ');
  });

  it('should handle facilities from different centers', () => {
    const meguroFacility = {
      ...mockFacility,
      centerName: '目黒区民センター',
      facilityName: '田道住区センター三田分室',
      roomName: '音楽室'
    };

    render(
      <table>
        <tbody>
          <AvailabilityTableRow 
            facility={meguroFacility} 
            formatUpdateTime={mockFormatUpdateTime} 
          />
        </tbody>
      </table>
    );

    const badge = screen.getAllByRole('img')[0];
    fireEvent.click(badge);

    expect(availabilityUtils.openBookingUrl).toHaveBeenCalledWith('目黒区民センター');
  });
});