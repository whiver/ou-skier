-- CreateEnum
CREATE TYPE "Region" AS ENUM (
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

-- CreateEnum
CREATE TYPE "Department" AS ENUM (
    '01', '02', '03', '04', '05', '06', '07', '08', '09',
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '23', '24', '25', '26', '27', '28', '29',
    '2A', '2B',
    '30', '31', '32', '33', '34', '35', '36', '37', '38', '39',
    '40', '41', '42', '43', '44', '45', '46', '47', '48', '49',
    '50', '51', '52', '53', '54', '55', '56', '57', '58', '59',
    '60', '61', '62', '63', '64', '65', '66', '67', '68', '69',
    '70', '71', '72', '73', '74', '75', '76', '77', '78', '79',
    '80', '81', '82', '83', '84', '85', '86', '87', '88', '89',
    '90', '91', '92', '93', '94', '95'
);

-- CreateTable
CREATE TABLE "Resort" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "region" "Region",
    "department" "Department",
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
