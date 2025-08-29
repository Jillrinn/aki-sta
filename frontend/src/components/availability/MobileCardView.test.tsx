import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MobileCardView from './MobileCardView';
import { Facility } from '../../types/availability';

describe('MobileCardView', () => {
  const mockFormatUpdateTime = (dateString: string) => {
    const date = new Date(dateString);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const mockFacility: Facility = {
    facilityName: 'あんさんぶるStudio和(本郷)',
    timeSlots: {
      '9-12': 'available',
      '13-17': 'booked',
      '18-21': 'unknown'
    },
    lastUpdated: '2025-08-24T14:18:03Z'
  };

  it('renders facility name correctly', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    expect(screen.getByText('あんさんぶるStudio和(本郷)')).toBeInTheDocument();
  });

  it('renders all time slots with labels', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    expect(screen.getByText('9-12時')).toBeInTheDocument();
    expect(screen.getByText('13-17時')).toBeInTheDocument();
    expect(screen.getByText('18-21時')).toBeInTheDocument();
  });

  it('renders status badges for each time slot', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Check for status symbols
    expect(screen.getByText('○')).toBeInTheDocument(); // available
    expect(screen.getByText('×')).toBeInTheDocument(); // booked
    expect(screen.getByText('?')).toBeInTheDocument(); // unknown
  });

  it('renders status text for each time slot', () => {
    render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    expect(screen.getByText('空き')).toBeInTheDocument();
    expect(screen.getByText('予約済み')).toBeInTheDocument();
    expect(screen.getByText('不明')).toBeInTheDocument();
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

  it('applies green background for available slots', () => {
    const { container } = render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    const availableSlot = container.querySelector('.bg-green-50');
    expect(availableSlot).toBeInTheDocument();
    expect(availableSlot).toHaveTextContent('9-12時');
  });

  it('applies gray background for non-available slots', () => {
    const { container } = render(
      <MobileCardView 
        facility={mockFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    // Find time slot containers with gray background
    const allSlots = container.querySelectorAll('[class*="rounded-lg"]');
    const graySlots = Array.from(allSlots).filter(el => 
      el.className.includes('bg-gray-50')
    );
    expect(graySlots.length).toBe(2); // booked and unknown slots
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
    const header = container.querySelector('.bg-gradient-to-r.from-blue-600.to-blue-700');
    expect(header).toBeInTheDocument();
    
    // Check footer with update time
    const footer = container.querySelector('.bg-gray-50.border-t');
    expect(footer).toBeInTheDocument();
  });

  it('handles all available slots correctly', () => {
    const allAvailableFacility: Facility = {
      facilityName: 'テスト施設',
      timeSlots: {
        '9-12': 'available',
        '13-17': 'available',
        '18-21': 'available'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    const { container } = render(
      <MobileCardView 
        facility={allAvailableFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    const greenSlots = container.querySelectorAll('.bg-green-50');
    expect(greenSlots.length).toBe(3);
    
    const availableTexts = screen.getAllByText('空き');
    expect(availableTexts.length).toBe(3);
  });

  it('handles all booked slots correctly', () => {
    const allBookedFacility: Facility = {
      facilityName: 'テスト施設',
      timeSlots: {
        '9-12': 'booked',
        '13-17': 'booked',
        '18-21': 'booked'
      },
      lastUpdated: '2025-08-24T14:18:03Z'
    };

    render(
      <MobileCardView 
        facility={allBookedFacility} 
        formatUpdateTime={mockFormatUpdateTime}
      />
    );
    
    const bookedTexts = screen.getAllByText('予約済み');
    expect(bookedTexts.length).toBe(3);
  });

  it('handles lottery status correctly', () => {
    const lotteryFacility: Facility = {
      facilityName: 'テスト施設',
      timeSlots: {
        '9-12': 'lottery',
        '13-17': 'available',
        '18-21': 'booked'
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
});