-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" TEXT,
    "bgg_id" INTEGER,
    "category" TEXT,
    "complexity" TEXT,
    "players_min" INTEGER,
    "players_max" INTEGER,
    "playtime_min_minutes" INTEGER,
    "playtime_max_minutes" INTEGER,
    "min_age" INTEGER,
    "price" DECIMAL,
    "sale_price" DECIMAL,
    "stock" INTEGER,
    "rating" DECIMAL,
    "reviews_count" INTEGER,
    "description" TEXT,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "games_name_key" ON "games"("name");
