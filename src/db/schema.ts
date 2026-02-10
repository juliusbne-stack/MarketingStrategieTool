import { integer, pgTable, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Decks table - stores flashcard decks created by users
export const decksTable = pgTable("decks", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: varchar({ length: 255 }).notNull(), // Clerk user ID
  title: varchar({ length: 255 }).notNull(),
  description: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

// Cards table - stores individual flashcards within decks
export const cardsTable = pgTable("cards", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  deckId: integer().notNull().references(() => decksTable.id, { onDelete: "cascade" }),
  front: text().notNull(), // Question/prompt side (e.g., "Dog" or "When was the battle of hastings?")
  back: text().notNull(), // Answer side (e.g., "Anjing" or "1066")
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
});

// Relations
export const decksRelations = relations(decksTable, ({ many }) => ({
  cards: many(cardsTable),
}));

export const cardsRelations = relations(cardsTable, ({ one }) => ({
  deck: one(decksTable, {
    fields: [cardsTable.deckId],
    references: [decksTable.id],
  }),
}));
