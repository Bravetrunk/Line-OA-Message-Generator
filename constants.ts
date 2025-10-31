import { QuickItem, StoreConfig } from './types';

export const LS_QUICK_ITEMS_KEY = 'lineOaQuickItems';
export const LS_HISTORY_KEY = 'lineOaOrderHistory';
export const LS_CONFIG_KEY = 'lineOaStoreConfig';

export const DEFAULT_QUICK_ITEMS: QuickItem[] = [
  { name: 'ชุดยาแก้ปวด', unit: 'ชุด' },
  { name: 'ยาแก้ปวดปลายประสาท', unit: 'ซอง' },
  { name: 'วิตามินบำรุงอาการชา', unit: 'กระปุก' },
];

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  contactPhone: '',
};

export const UNIT_OPTIONS: string[] = [
  'ชุด', 'ซอง', 'เม็ด', 'กล่อง', 'แผง', 'ขวด', 'กระปุก', 'ชิ้น', 'อัน', 'อื่นๆ'
];