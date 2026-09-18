import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  caption: text("caption").notNull().default(""),
  format: text("format").notNull().default("Reel"),
  status: text("status").notNull().default("Draft"),
  scheduledAt: text("scheduled_at").notNull(),
  location: text("location").notNull().default(""),
  tone: text("tone").notNull().default("sea"),
  assignee: text("assignee").notNull().default("Malta team"),
  mediaId: text("media_id"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_posts_scheduled_at").on(table.scheduledAt),
  index("idx_posts_status").on(table.status),
  index("idx_posts_media_id").on(table.mediaId),
]);

export const mediaAssets = sqliteTable("media_assets", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  caption: text("caption").notNull().default(""),
  status: text("status").notNull().default("Draft"),
  mimeType: text("mime_type").notNull(),
  objectKey: text("object_key").notNull(),
  uploadedBy: text("uploaded_by").notNull(),
  usedCount: integer("used_count").notNull().default(0),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_media_assets_status").on(table.status)]);

export const ideas = sqliteTable("ideas", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull().default("Idea"),
  title: text("title").notNull(),
  notes: text("notes").notNull().default(""),
  color: text("color").notNull().default("coral"),
  createdBy: text("created_by").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_ideas_kind").on(table.kind)]);

export const creators = sqliteTable("creators", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull().default(""),
  specialties: text("specialties").notNull().default("[]"),
  status: text("status").notNull().default("Prospect"),
  instagram: text("instagram").notNull().default(""),
  location: text("location").notNull().default(""),
  bio: text("bio").notNull().default(""),
  notes: text("notes").notNull().default(""),
  nextAction: text("next_action").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_creators_status").on(table.status)]);
