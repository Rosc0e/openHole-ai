CREATE TABLE "graphs" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text,
	"content" text,
	"updated_at" integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer))
);
