import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  sessions: defineTable({
    title: v.string(),
    userId: v.id("users"),
    totalTime: v.number(),
  }).index("by_user", ["userId"]),
  
  sessionElements: defineTable({
    sessionId: v.id("sessions"),
    title: v.string(),
    time: v.number(),
    notes: v.string(),
    order: v.number(),
  }).index("by_session", ["sessionId", "order"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
