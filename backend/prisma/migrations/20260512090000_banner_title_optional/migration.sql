-- Allow image-only banners by making title optional.
ALTER TABLE "Banner" ALTER COLUMN "title" DROP NOT NULL;
