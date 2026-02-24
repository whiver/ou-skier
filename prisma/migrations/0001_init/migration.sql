-- CreateEnum
CREATE TYPE "region" AS ENUM (
    'Auvergne-Rhône-Alpes',
    'Bourgogne-Franche-Comté',
    'Bretagne',
    'Centre-Val de Loire',
    'Corse',
    'Grand Est',
    'Hauts-de-France',
    'Île-de-France',
    'Normandie',
    'Nouvelle-Aquitaine',
    'Occitanie',
    'Pays de la Loire',
    'Provence-Alpes-Côte d''Azur'
);

-- CreateTable
CREATE TABLE "Resort" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" "region",
    "domainUrl" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SnowRecord" (
    "id" SERIAL NOT NULL,
    "resortId" INTEGER NOT NULL,
    "recordDate" TIMESTAMP(3) NOT NULL,
    "openSlopes" INTEGER,
    "totalSlopes" INTEGER,
    "snowDepthBase" DOUBLE PRECISION,
    "snowDepthTop" DOUBLE PRECISION,
    "freshSnow" DOUBLE PRECISION,
    "notes" TEXT,
    "sourceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SnowRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resort_name_key" ON "Resort"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SnowRecord_resortId_recordDate_key" ON "SnowRecord"("resortId", "recordDate");

-- AddForeignKey
ALTER TABLE "SnowRecord" ADD CONSTRAINT "SnowRecord_resortId_fkey" FOREIGN KEY ("resortId") REFERENCES "Resort"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
