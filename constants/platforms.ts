import { Colors } from './colors';

export interface Platform {
  id: string;
  name: string;
  nameAr: string;
  color: string;
  trustScore: number;
  isLocal: boolean;
  shipsFrom: 'UAE' | 'KSA' | 'China' | 'Global';
  affiliateParam: string;
  returnDays: number;
  warrantyType: 'local' | 'international' | 'seller' | 'none';
}

export const PLATFORMS: Record<string, Platform> = {
  amazon: {
    id: 'amazon',
    name: 'Amazon.ae',
    nameAr: 'أمازون',
    color: Colors.platform.amazon,
    trustScore: 96,
    isLocal: true,
    shipsFrom: 'UAE',
    affiliateParam: 'tag=waffir-21',
    returnDays: 30,
    warrantyType: 'local',
  },
  noon: {
    id: 'noon',
    name: 'Noon.com',
    nameAr: 'نون',
    color: Colors.platform.noon,
    trustScore: 94,
    isLocal: true,
    shipsFrom: 'UAE',
    affiliateParam: 'utm_source=waffir',
    returnDays: 15,
    warrantyType: 'local',
  },
  namshi: {
    id: 'namshi',
    name: 'Namshi.com',
    nameAr: 'نمشي',
    color: Colors.platform.namshi,
    trustScore: 92,
    isLocal: true,
    shipsFrom: 'UAE',
    affiliateParam: 'aff=waffir',
    returnDays: 30,
    warrantyType: 'seller',
  },
  carrefour: {
    id: 'carrefour',
    name: 'Carrefour',
    nameAr: 'كارفور',
    color: '#0070C0',
    trustScore: 90,
    isLocal: true,
    shipsFrom: 'UAE',
    affiliateParam: 'ref=waffir',
    returnDays: 14,
    warrantyType: 'local',
  },
  sharafDG: {
    id: 'sharafDG',
    name: 'Sharaf DG',
    nameAr: 'شرف دي جي',
    color: '#E31837',
    trustScore: 91,
    isLocal: true,
    shipsFrom: 'UAE',
    affiliateParam: 'src=waffir',
    returnDays: 14,
    warrantyType: 'local',
  },
  lulu: {
    id: 'lulu',
    name: 'LuLu',
    nameAr: 'لولو',
    color: '#00A651',
    trustScore: 88,
    isLocal: true,
    shipsFrom: 'UAE',
    affiliateParam: 'ref=waffir',
    returnDays: 7,
    warrantyType: 'seller',
  },
  extra: {
    id: 'extra',
    name: 'eXtra',
    nameAr: 'اكسترا',
    color: '#FF6600',
    trustScore: 89,
    isLocal: true,
    shipsFrom: 'KSA',
    affiliateParam: 'aff=waffir',
    returnDays: 14,
    warrantyType: 'local',
  },
  jarir: {
    id: 'jarir',
    name: 'Jarir',
    nameAr: 'جرير',
    color: '#CC0000',
    trustScore: 87,
    isLocal: true,
    shipsFrom: 'KSA',
    affiliateParam: 'src=waffir',
    returnDays: 14,
    warrantyType: 'local',
  },
  aliexpress: {
    id: 'aliexpress',
    name: 'AliExpress',
    nameAr: 'علي إكسبرس',
    color: Colors.platform.aliexpress,
    trustScore: 78,
    isLocal: false,
    shipsFrom: 'China',
    affiliateParam: 'aff_fcid=waffir',
    returnDays: 15,
    warrantyType: 'seller',
  },
  temu: {
    id: 'temu',
    name: 'Temu',
    nameAr: 'تيمو',
    color: Colors.platform.temu,
    trustScore: 70,
    isLocal: false,
    shipsFrom: 'China',
    affiliateParam: 'refer=waffir',
    returnDays: 90,
    warrantyType: 'none',
  },
};

export const PLATFORM_ORDER = [
  'amazon', 'noon', 'namshi', 'carrefour', 'sharafDG',
  'lulu', 'extra', 'jarir', 'aliexpress', 'temu',
];

export const LOCAL_PLATFORMS = PLATFORM_ORDER.filter(id => PLATFORMS[id]?.isLocal);
