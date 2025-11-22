CREATE TABLE "graphs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text,
	"content" jsonb,
	"updated_at" timestamp DEFAULT now()
);
