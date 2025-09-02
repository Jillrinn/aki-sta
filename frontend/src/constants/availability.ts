export const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;
export type TimeSlot = typeof TIME_SLOTS[number];

export const TIME_SLOT_DISPLAY: Record<TimeSlot, string> = {
  morning: '9-12時',
  afternoon: '13-17時',
  evening: '18-21時'
};

export const STATUS_VALUES = ['available', 'booked', 'lottery', 'unknown'] as const;
export type StatusValue = typeof STATUS_VALUES[number];

export const STATUS_SYMBOLS: Record<StatusValue, string> = {
  available: '○',
  booked: '×',
  lottery: '△',
  unknown: '?'
};

export const STATUS_COLORS: Record<StatusValue, string> = {
  available: 'bg-status-available',
  booked: 'bg-status-reserved',
  lottery: 'bg-status-pending',
  unknown: 'bg-gray-500'
};

export const STATUS_LABELS: Record<StatusValue, string> = {
  available: '空き',
  booked: '予約済み',
  lottery: '抽選',
  unknown: '不明'
};