import { sortCentersByPriority, sortFacilitiesByPriority, sortGroupedFacilities } from './sortingUtils';
import { Facility } from '../types/availability';

describe('sortingUtils', () => {
  describe('sortCentersByPriority', () => {
    it('should sort centers according to priority order', () => {
      const centers = ['目黒区民センター', 'Ensemble Studio', 'その他'];
      const sorted = sortCentersByPriority(centers);
      
      expect(sorted).toEqual(['Ensemble Studio', '目黒区民センター', 'その他']);
    });

    it('should handle centers not in priority list', () => {
      const centers = ['新センター2', 'Ensemble Studio', '新センター1'];
      const sorted = sortCentersByPriority(centers);
      
      expect(sorted[0]).toBe('Ensemble Studio');
      // 未定義のセンターは日本語アルファベット順
      expect(sorted[1]).toBe('新センター1');
      expect(sorted[2]).toBe('新センター2');
    });
  });

  describe('sortFacilitiesByPriority', () => {
    it('should sort Ensemble Studio facilities by priority', () => {
      const facilities: Facility[] = [
        {
          centerName: 'Ensemble Studio',
          facilityName: 'あんさんぶるStudio音(初台)',
          roomName: 'Room B',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'Ensemble Studio',
          facilityName: 'あんさんぶるStudio和(本郷)',
          roomName: 'Room A',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        }
      ];

      const sorted = sortFacilitiesByPriority(facilities, 'Ensemble Studio');
      
      expect(sorted[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      expect(sorted[1].facilityName).toBe('あんさんぶるStudio音(初台)');
    });

    it('should handle facilities not in priority list', () => {
      const facilities: Facility[] = [
        {
          centerName: 'Ensemble Studio',
          facilityName: '新施設B',
          roomName: 'Room C',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'Ensemble Studio',
          facilityName: 'あんさんぶるStudio和(本郷)',
          roomName: 'Room A',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'Ensemble Studio',
          facilityName: '新施設A',
          roomName: 'Room D',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        }
      ];

      const sorted = sortFacilitiesByPriority(facilities, 'Ensemble Studio');
      
      // 優先度リストにある施設が最初
      expect(sorted[0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      // 未定義の施設は日本語アルファベット順
      expect(sorted[1].facilityName).toBe('新施設A');
      expect(sorted[2].facilityName).toBe('新施設B');
    });
  });

  describe('sortGroupedFacilities', () => {
    it('should sort both centers and facilities by priority', () => {
      const groupedByCenter = {
        '目黒区民センター': [
          {
            centerName: '目黒区民センター',
            facilityName: '新施設',
            roomName: 'Room X',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          },
          {
            centerName: '目黒区民センター',
            facilityName: '田道住区センター三田分室',
            roomName: 'Room Y',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          }
        ],
        'Ensemble Studio': [
          {
            centerName: 'Ensemble Studio',
            facilityName: 'あんさんぶるStudio音(初台)',
            roomName: 'Room B',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          },
          {
            centerName: 'Ensemble Studio',
            facilityName: 'あんさんぶるStudio和(本郷)',
            roomName: 'Room A',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          }
        ]
      };

      const sorted = sortGroupedFacilities(groupedByCenter);
      
      // センターの順序確認
      expect(sorted[0][0]).toBe('Ensemble Studio');
      expect(sorted[1][0]).toBe('目黒区民センター');
      
      // Ensemble Studio内の施設順序確認
      expect(sorted[0][1][0].facilityName).toBe('あんさんぶるStudio和(本郷)');
      expect(sorted[0][1][1].facilityName).toBe('あんさんぶるStudio音(初台)');
      
      // 目黒区民センター内の施設順序確認
      expect(sorted[1][1][0].facilityName).toBe('田道住区センター三田分室');
      expect(sorted[1][1][1].facilityName).toBe('新施設');
    });
  });
});