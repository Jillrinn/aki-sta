import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileCardView from './MobileCardView';
import { Facility } from '../../../types/availability';
import * as availabilityUtils from '../../../utils/availabilityUtils';

// Mock the utility function
jest.mock('../../../utils/availabilityUtils', () => ({
  openBookingUrl: jest.fn()
}));

describe('MobileCardView', () => {
  const mockFormatUpdateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const mockFacility: Facility = {
    centerName: 'あんさんぶるStudio',
    facilityName: 'あんさんぶるStudio和(本郷)',
    roomName: '練習室',
    timeSlots: {
      'morning': 'available',
      'afternoon': 'booked',
      'evening': 'unknown'
    },
    lastUpdated: '2025-08-24T14:18:03Z'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders facility name correctly', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    expect(screen.getByText('あんさんぶるStudio和(本郷)')).toBeInTheDocument();
  });

  it('renders all time slots with labels when expanded', () => {
    // Use a facility without afternoon booked to ensure it's expanded
    const expandedFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'available',
        'evening': 'unknown'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={expandedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Should be expanded (has available slots and afternoon is not booked)
    expect(screen.getByText('午前')).toBeInTheDocument();
    expect(screen.getByText('午後')).toBeInTheDocument();
    expect(screen.getByText('夜間')).toBeInTheDocument();
  });

  it('renders status badges for each time slot when expanded', () => {
    const expandedFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'lottery',
        'evening': 'unknown'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={expandedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Check for status symbols
    expect(screen.getByText('○')).toBeInTheDocument(); // available
    expect(screen.getByText('△')).toBeInTheDocument(); // lottery
    // unknownステータスは表示されない
    expect(screen.queryByText('?')).not.toBeInTheDocument();
  });

  it('shows collapsed message for afternoon booked', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Should show "希望時間は予約済み" since afternoon is booked
    expect(screen.getByText('希望時間は予約済み')).toBeInTheDocument();
    
    // Should not show time slots since it's collapsed
    expect(screen.queryByText('午前')).not.toBeInTheDocument();
  });

  it('renders update time correctly', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Check for formatted time with "更新" suffix
    expect(screen.getByText(/08\/24 \d{2}:18 更新/)).toBeInTheDocument();
  });

  it('applies green background for available slots when expanded', () => {
    const expandedFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'available',
        'evening': 'booked'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    const { container } = render(
      <MobileCardView 
        facility={expandedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    const availableSlot = container.querySelector('[class*="bg-accent-green"]');
    expect(availableSlot).toBeInTheDocument();
    expect(availableSlot).toHaveTextContent('午前');
  });

  it('applies gray background for non-available slots when expanded', () => {
    const expandedFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'unknown',
        'evening': 'booked'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    const { container } = render(
      <MobileCardView 
        facility={expandedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Find time slot containers with gray background
    const allSlots = container.querySelectorAll('[class*="rounded-lg"]');
    const graySlots = Array.from(allSlots).filter(el => 
      el.className.includes('bg-gray-50')
    );
    expect(graySlots.length).toBe(2); // unknown and booked slots
  });

  it('renders card with proper structure', () => {
    const { container } = render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Check main card container
    const card = container.querySelector('.bg-white.rounded-lg.shadow-md');
    expect(card).toBeInTheDocument();
    
    // Check header with gradient
    const header = container.querySelector('[class*="bg-gradient-to-r"]');
    expect(header).toBeInTheDocument();
    
    // Check footer with update time
    const footer = container.querySelector('.bg-gray-50.border-t');
    expect(footer).toBeInTheDocument();
  });

  it('handles all available slots correctly', () => {
    const allAvailableFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'available',
        'evening': 'available'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    const { container } = render(
      <MobileCardView 
        facility={allAvailableFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    const greenSlots = container.querySelectorAll('[class*="bg-accent-green"]');
    expect(greenSlots.length).toBe(3);
    
    const availableTexts = screen.getAllByText('空き');
    expect(availableTexts.length).toBe(3);
  });

  it('handles all booked slots correctly', () => {
    const allBookedFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'booked',
        'afternoon': 'booked',
        'evening': 'booked'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    const { container } = render(
      <MobileCardView 
        facility={allBookedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Should be collapsed by default
    expect(screen.queryByText('午前')).not.toBeInTheDocument();
    expect(screen.queryByText('予約済み')).not.toBeInTheDocument();
    
    // Should show gray header when all booked
    const header = container.querySelector('[class*="from-gray"]');
    expect(header).toBeInTheDocument();
    
    // Should show "全て空きなし" message
    expect(screen.getByText('全て空きなし')).toBeInTheDocument();
  });

  it('handles lottery status correctly', () => {
    const lotteryFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'lottery',
        'afternoon': 'available',
        'evening': 'booked'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={lotteryFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    expect(screen.getByText('抽選')).toBeInTheDocument();
  });

  it('displays clock emoji in update time section', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    expect(screen.getByText('🕐')).toBeInTheDocument();
  });

  it('collapses when all slots are unknown', () => {
    const allUnknownFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'unknown',
        'afternoon': 'unknown',
        'evening': 'unknown'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    const { container } = render(
      <MobileCardView 
        facility={allUnknownFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Should be collapsed by default
    expect(screen.queryByText('午前')).not.toBeInTheDocument();
    
    // Should show gray header
    const header = container.querySelector('[class*="from-gray-400"]');
    expect(header).toBeInTheDocument();
    
    // "全て不明" message should not be shown anymore
    expect(screen.queryByText('全て不明')).not.toBeInTheDocument();
    // No status message should be shown for all unknown
    expect(screen.queryByText('全て空きなし')).not.toBeInTheDocument();
    expect(screen.queryByText('希望時間は予約済み')).not.toBeInTheDocument();
    expect(screen.queryByText('空きあり')).not.toBeInTheDocument();
  });

  it('collapses when afternoon slot is booked', () => {
    const afternoonBookedFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'booked',
        'evening': 'available'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={afternoonBookedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Should be collapsed even though there are available slots
    expect(screen.queryByText('午前')).not.toBeInTheDocument();
    
    // Should show "希望時間は予約済み" message
    expect(screen.getByText('希望時間は予約済み')).toBeInTheDocument();
  });

  it('toggles expansion when header is clicked', () => {
    const noAfternoonFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'available',
        'evening': 'booked'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={noAfternoonFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Initially expanded (has available slots and afternoon is not booked)
    expect(screen.getByText('午前')).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
    
    // Click to collapse
    const header = screen.getByText('テスト施設').closest('div')?.parentElement;
    fireEvent.click(header!);
    
    // Should be collapsed
    expect(screen.queryByText('午前')).not.toBeInTheDocument();
    expect(screen.getByText('＋')).toBeInTheDocument();
    
    // Click to expand again
    fireEvent.click(header!);
    
    // Should be expanded
    expect(screen.getByText('午前')).toBeInTheDocument();
    expect(screen.getByText('−')).toBeInTheDocument();
  });

  it('calls openBookingUrl when time slot is clicked', () => {
    const expandedFacility: Facility = {
      centerName: 'テストセンター',
      facilityName: 'テスト施設',
      roomName: 'テスト室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'available',
        'evening': 'booked'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={expandedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Initially expanded (has available slots and afternoon is not booked)
    const morningSlot = screen.getByText('午前').closest('div');
    fireEvent.click(morningSlot!);
    
    expect(availabilityUtils.openBookingUrl).toHaveBeenCalledWith('テストセンター');
    expect(availabilityUtils.openBookingUrl).toHaveBeenCalledTimes(1);
  });

  it('calls openBookingUrl with correct center name for different facilities', () => {
    const ensembleFacility: Facility = {
      centerName: 'あんさんぶるStudio',
      facilityName: 'あんさんぶるStudio和(本郷)',
      roomName: '練習室',
      timeSlots: {
        'morning': 'available',
        'afternoon': 'available',
        'evening': 'available'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={ensembleFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    const afternoonSlot = screen.getByText('午後').closest('div');
    fireEvent.click(afternoonSlot!);
    
    expect(availabilityUtils.openBookingUrl).toHaveBeenCalledWith('あんさんぶるStudio');
  });
});