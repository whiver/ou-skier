export interface SnowRecord {
  id: number;
  resortId: number;
  recordDate: string;
  openSlopes: number | null;
  totalSlopes: number | null;
  snowDepthBase: number | null;
  snowDepthTop: number | null;
  freshSnow: number | null;
  notes: string | null;
  sourceUrl: string | null;
  createdAt: string;
}

export interface Resort {
  id: number;
  name: string;
  region: string | null;
  domainUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  snowRecords: SnowRecord[];
}
