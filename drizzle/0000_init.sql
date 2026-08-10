CREATE TYPE "public"."firewall_mode" AS ENUM('blacklist', 'whitelist');--> statement-breakpoint
CREATE TABLE "firewall_rules" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "firewall_rules_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"type_id" integer NOT NULL,
	"mode" "firewall_mode" NOT NULL,
	"value" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_types" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "rule_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "firewall_rules" ADD CONSTRAINT "firewall_rules_type_id_rule_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."rule_types"("id") ON DELETE no action ON UPDATE no action;