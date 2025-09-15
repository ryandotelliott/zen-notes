-- CreateTable
CREATE TABLE "public"."Note" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "content_text" TEXT NOT NULL,
    "content_json" TEXT NOT NULL,
    "listOrderSeq" INTEGER NOT NULL DEFAULT 0,
    "pinned" BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);
