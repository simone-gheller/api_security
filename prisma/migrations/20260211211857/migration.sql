-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "time" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "spaceId" TEXT NOT NULL,
    CONSTRAINT "Message_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
