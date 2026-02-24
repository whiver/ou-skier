import type { Region } from "@prisma/client";

export interface ResortSnowData {
  name: string;
  region: Region | null;
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
