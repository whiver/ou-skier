CREATE INDEX "SnowRecord_resortId_recordDate_openSlopes_idx"
ON "SnowRecord" ("resortId", "recordDate") INCLUDE ("openSlopes");
