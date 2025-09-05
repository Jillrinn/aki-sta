import { Facility } from '../types/availability';
import { FACILITY_PRIORITY, CENTER_PRIORITY } from '../constants/facilityOrder';

/**
 * センター名を優先度順でソート
 */
export const sortCentersByPriority = (centers: string[]): string[] => {
  return centers.sort((a, b) => {
    const aIndex = CENTER_PRIORITY.indexOf(a);
    const bIndex = CENTER_PRIORITY.indexOf(b);
    
    // 両方が優先度リストにある場合
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // aのみが優先度リストにある場合
    if (aIndex !== -1) return -1;
    
    // bのみが優先度リストにある場合
    if (bIndex !== -1) return 1;
    
    // どちらも優先度リストにない場合は日本語のアルファベット順
    return a.localeCompare(b, 'ja');
  });
};

/**
 * 施設を優先度順でソート
 * @param facilities ソート対象の施設配列
 * @param centerName センター名
 */
export const sortFacilitiesByPriority = (facilities: Facility[], centerName: string): Facility[] => {
  const priorityList = FACILITY_PRIORITY[centerName] || [];
  
  return facilities.sort((a, b) => {
    const aIndex = priorityList.indexOf(a.facilityName);
    const bIndex = priorityList.indexOf(b.facilityName);
    
    // 両方が優先度リストにある場合
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // aのみが優先度リストにある場合
    if (aIndex !== -1) return -1;
    
    // bのみが優先度リストにある場合
    if (bIndex !== -1) return 1;
    
    // どちらも優先度リストにない場合は日本語のアルファベット順
    return a.facilityName.localeCompare(b.facilityName, 'ja');
  });
};

/**
 * グループ化されたセンターと施設を優先度順でソート
 */
export const sortGroupedFacilities = (
  groupedByCenter: { [key: string]: Facility[] }
): [string, Facility[]][] => {
  // センター名を優先度順で取得
  const sortedCenters = sortCentersByPriority(Object.keys(groupedByCenter));
  
  // 各センターの施設を優先度順でソート
  return sortedCenters.map(centerName => {
    const sortedFacilities = sortFacilitiesByPriority(
      groupedByCenter[centerName],
      centerName
    );
    return [centerName, sortedFacilities] as [string, Facility[]];
  });
};