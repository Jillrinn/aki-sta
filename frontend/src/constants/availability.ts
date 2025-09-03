export const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;
export type TimeSlot = typeof TIME_SLOTS[number];

export const TIME_SLOT_DISPLAY: Record<TimeSlot, string> = {
  morning: '午前',
  afternoon: '午後',
  evening: '夜間'
};

export const STATUS_VALUES = ['available', 'booked', 'booked_1', 'booked_2', 'lottery', 'unknown'] as const;
export type StatusValue = typeof STATUS_VALUES[number];

export const STATUS_SYMBOLS: Record<StatusValue, string> = {
  available: '○',
  booked: '×',
  booked_1: '△',
  booked_2: '△',
  lottery: '△',
  unknown: '?'
};

export const STATUS_COLORS: Record<StatusValue, string> = {
  available: 'bg-status-available',
  booked: 'bg-status-reserved',
  booked_1: 'bg-yellow-400',
  booked_2: 'bg-yellow-400',
  lottery: 'bg-status-pending',
  unknown: 'bg-gray-500'
};

export const STATUS_LABELS: Record<StatusValue, string> = {
  available: '空き',
  booked: '予約済み',
  booked_1: '一部予約済み',
  booked_2: '一部予約済み',
  lottery: '抽選',
  unknown: '不明'
};