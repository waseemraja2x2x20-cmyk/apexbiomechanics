CREATE TABLE "apex_profiles" (
	"owner" text PRIMARY KEY,
	"name" text DEFAULT '' NOT NULL,
	"shield" text DEFAULT 'on' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apex_sessions" (
	"id" uuid PRIMARY KEY,
	"owner" text NOT NULL,
	"kind" text NOT NULL,
	"day" text NOT NULL,
	"result" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "apex_sessions_owner_date" ON "apex_sessions" ("owner","created_at");