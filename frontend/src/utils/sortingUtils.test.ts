import { sortCentersByPriority, sortFacilitiesByPriority, sortGroupedFacilities } from './sortingUtils';
import { Facility } from '../types/availability';

// facilityOrder.tsをモック化して、テストが実際の設定値に依存しないようにする
jest.mock('../constants/facilityOrder', () => ({
  CENTER_PRIORITY: ['TestCenter1', 'TestCenter2', 'TestCenter3'],
  FACILITY_PRIORITY: {
    'TestCenter1': ['Facility1-A', 'Facility1-B', 'Facility1-C'],
    'TestCenter2': ['Facility2-A', 'Facility2-B'],
    'TestCenter3': ['Facility3-A']
  }
}));

describe('sortingUtils', () => {
  describe('sortCentersByPriority', () => {
    it('should sort centers according to priority order', () => {
      const centers = ['TestCenter3', 'TestCenter1', 'TestCenter2'];
      const sorted = sortCentersByPriority(centers);
      
      // モックされた優先度順になることを確認
      expect(sorted).toEqual(['TestCenter1', 'TestCenter2', 'TestCenter3']);
    });

    it('should handle centers not in priority list', () => {
      const centers = ['UnknownCenter2', 'TestCenter2', 'UnknownCenter1', 'TestCenter1'];
      const sorted = sortCentersByPriority(centers);
      
      // 優先度リストにあるものが先、その後は日本語アルファベット順
      expect(sorted[0]).toBe('TestCenter1');
      expect(sorted[1]).toBe('TestCenter2');
      expect(sorted[2]).toBe('UnknownCenter1');
      expect(sorted[3]).toBe('UnknownCenter2');
    });

    it('should handle empty array', () => {
      const centers: string[] = [];
      const sorted = sortCentersByPriority(centers);
      
      expect(sorted).toEqual([]);
    });

    it('should handle all unknown centers', () => {
      const centers = ['Unknown3', 'Unknown1', 'Unknown2'];
      const sorted = sortCentersByPriority(centers);
      
      // 全て未定義の場合は日本語アルファベット順
      expect(sorted).toEqual(['Unknown1', 'Unknown2', 'Unknown3']);
    });
  });

  describe('sortFacilitiesByPriority', () => {
    it('should sort facilities by priority for TestCenter1', () => {
      const facilities: Facility[] = [
        {
          centerName: 'TestCenter1',
          facilityName: 'Facility1-C',
          roomName: 'Room C',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'TestCenter1',
          facilityName: 'Facility1-A',
          roomName: 'Room A',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'TestCenter1',
          facilityName: 'Facility1-B',
          roomName: 'Room B',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        }
      ];

      const sorted = sortFacilitiesByPriority(facilities, 'TestCenter1');
      
      // モックされた優先度順になることを確認
      expect(sorted[0].facilityName).toBe('Facility1-A');
      expect(sorted[1].facilityName).toBe('Facility1-B');
      expect(sorted[2].facilityName).toBe('Facility1-C');
    });

    it('should handle facilities not in priority list', () => {
      const facilities: Facility[] = [
        {
          centerName: 'TestCenter1',
          facilityName: 'UnknownFacilityZ',
          roomName: 'Room Z',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'TestCenter1',
          facilityName: 'Facility1-B',
          roomName: 'Room B',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'TestCenter1',
          facilityName: 'UnknownFacilityA',
          roomName: 'Room X',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        }
      ];

      const sorted = sortFacilitiesByPriority(facilities, 'TestCenter1');
      
      // 優先度リストにある施設が最初、その後は日本語アルファベット順
      expect(sorted[0].facilityName).toBe('Facility1-B');
      expect(sorted[1].facilityName).toBe('UnknownFacilityA');
      expect(sorted[2].facilityName).toBe('UnknownFacilityZ');
    });

    it('should handle center without priority configuration', () => {
      const facilities: Facility[] = [
        {
          centerName: 'UnknownCenter',
          facilityName: 'FacilityC',
          roomName: 'Room C',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'UnknownCenter',
          facilityName: 'FacilityA',
          roomName: 'Room A',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        },
        {
          centerName: 'UnknownCenter',
          facilityName: 'FacilityB',
          roomName: 'Room B',
          timeSlots: {},
          lastUpdated: '2025-01-01'
        }
      ];

      const sorted = sortFacilitiesByPriority(facilities, 'UnknownCenter');
      
      // 優先度設定がない場合は全て日本語アルファベット順
      expect(sorted[0].facilityName).toBe('FacilityA');
      expect(sorted[1].facilityName).toBe('FacilityB');
      expect(sorted[2].facilityName).toBe('FacilityC');
    });

    it('should handle empty facilities array', () => {
      const facilities: Facility[] = [];
      const sorted = sortFacilitiesByPriority(facilities, 'TestCenter1');
      
      expect(sorted).toEqual([]);
    });
  });

  describe('sortGroupedFacilities', () => {
    it('should sort both centers and facilities by priority', () => {
      const groupedByCenter = {
        'TestCenter2': [
          {
            centerName: 'TestCenter2',
            facilityName: 'Facility2-B',
            roomName: 'Room B',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          },
          {
            centerName: 'TestCenter2',
            facilityName: 'Facility2-A',
            roomName: 'Room A',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          }
        ],
        'TestCenter1': [
          {
            centerName: 'TestCenter1',
            facilityName: 'Facility1-B',
            roomName: 'Room B',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          },
          {
            centerName: 'TestCenter1',
            facilityName: 'Facility1-A',
            roomName: 'Room A',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          }
        ]
      };

      const sorted = sortGroupedFacilities(groupedByCenter);
      
      // センターの順序確認
      expect(sorted[0][0]).toBe('TestCenter1');
      expect(sorted[1][0]).toBe('TestCenter2');
      
      // TestCenter1内の施設順序確認
      expect(sorted[0][1][0].facilityName).toBe('Facility1-A');
      expect(sorted[0][1][1].facilityName).toBe('Facility1-B');
      
      // TestCenter2内の施設順序確認
      expect(sorted[1][1][0].facilityName).toBe('Facility2-A');
      expect(sorted[1][1][1].facilityName).toBe('Facility2-B');
    });

    it('should handle mixed known and unknown centers with facilities', () => {
      const groupedByCenter = {
        'UnknownCenter': [
          {
            centerName: 'UnknownCenter',
            facilityName: 'FacilityZ',
            roomName: 'Room Z',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          },
          {
            centerName: 'UnknownCenter',
            facilityName: 'FacilityA',
            roomName: 'Room A',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          }
        ],
        'TestCenter3': [
          {
            centerName: 'TestCenter3',
            facilityName: 'UnknownFacility',
            roomName: 'Room U',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          },
          {
            centerName: 'TestCenter3',
            facilityName: 'Facility3-A',
            roomName: 'Room A',
            timeSlots: {},
            lastUpdated: '2025-01-01'
          }
        ]
      };

      const sorted = sortGroupedFacilities(groupedByCenter);
      
      // センターの順序確認（TestCenter3が優先度リストにあるので先）
      expect(sorted[0][0]).toBe('TestCenter3');
      expect(sorted[1][0]).toBe('UnknownCenter');
      
      // TestCenter3内の施設順序確認（Facility3-Aが優先度リストにあるので先）
      expect(sorted[0][1][0].facilityName).toBe('Facility3-A');
      expect(sorted[0][1][1].facilityName).toBe('UnknownFacility');
      
      // UnknownCenter内の施設順序確認（全て日本語アルファベット順）
      expect(sorted[1][1][0].facilityName).toBe('FacilityA');
      expect(sorted[1][1][1].facilityName).toBe('FacilityZ');
    });

    it('should handle empty grouped facilities', () => {
      const groupedByCenter = {};
      const sorted = sortGroupedFacilities(groupedByCenter);
      
      expect(sorted).toEqual([]);
    });

    it('should handle centers with empty facility arrays', () => {
      const groupedByCenter = {
        'TestCenter1': [],
        'TestCenter2': []
      };

      const sorted = sortGroupedFacilities(groupedByCenter);
      
      expect(sorted[0][0]).toBe('TestCenter1');
      expect(sorted[0][1]).toEqual([]);
      expect(sorted[1][0]).toBe('TestCenter2');
      expect(sorted[1][1]).toEqual([]);
    });

    it('should sort Japanese text correctly', () => {
      const centers = ['センターか', 'センターあ', 'センターさ'];
      const sorted = sortCentersByPriority(centers);
      
      // 日本語の50音順でソート
      expect(sorted).toEqual(['センターあ', 'センターか', 'センターさ']);
    });
  });
});