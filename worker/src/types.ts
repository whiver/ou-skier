export interface ResortSnowData {
  name: string;
  region: string | null;
  department: string | null;
  domainUrl: string | null;
  recordDate: Date;
  openSlopes: number | null;
  totalSlopes: number | null;
  snowDepthBase: number | null;
  snowDepthTop: number | null;
  freshSnow: number | null;
  notes: string | null;
  sourceUrl: string;
}
