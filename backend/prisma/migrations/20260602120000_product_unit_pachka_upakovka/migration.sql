-- Add pack / package sale units for products and order snapshots.

ALTER TYPE "ProductUnit" ADD VALUE IF NOT EXISTS 'pachka';
ALTER TYPE "ProductUnit" ADD VALUE IF NOT EXISTS 'upakovka';

ALTER TYPE "UnitType" ADD VALUE IF NOT EXISTS 'pachka';
ALTER TYPE "UnitType" ADD VALUE IF NOT EXISTS 'upakovka';
