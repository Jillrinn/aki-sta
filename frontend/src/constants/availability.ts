export const TIME_SLOTS = ['9-12', '13-17', '18-21'] as const;
export type TimeSlot = typeof TIME_SLOTS[number];

export const STATUS_VALUES = ['available', 'booked', 'lottery', 'unknown'] as const;
export type StatusValue = typeof STATUS_VALUES[number];

export const STATUS_SYMBOLS: Record<StatusValue, string> = {
  available: '○',
  booked: '×',
  lottery: '△',
  unknown: '?'
};

export const STATUS_COLORS: Record<StatusValue, string> = {
  available: 'bg-green-500',
  booked: 'bg-red-500',
  lottery: 'bg-orange-500',
  unknown: 'bg-gray-500'
};

export const STATUS_LABELS: Record<StatusValue, string> = {
  available: '空き',
  booked: '予約済み',
  lottery: '抽選',
  unknown: '不明'
};