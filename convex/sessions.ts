import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const list = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (args.search) {
      return sessions.filter((s) => 
        s.title.toLowerCase().includes(args.search!.toLowerCase())
      );
    }
    return sessions;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("sessions", {
      title: args.title,
      userId,
      totalTime: 0,
    });
  },
});

export const getElements = query({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessionElements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
  },
});

export const addElement = mutation({
  args: {
    sessionId: v.id("sessions"),
    title: v.string(),
    time: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const elements = await ctx.db
      .query("sessionElements")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const newOrder = elements.length;
    
    await ctx.db.insert("sessionElements", {
      ...args,
      order: newOrder,
    });

    const totalTime = elements.reduce((sum, el) => sum + el.time, 0) + args.time;
    await ctx.db.patch(args.sessionId, { totalTime });
  },
});

export const updateElement = mutation({
  args: {
    elementId: v.id("sessionElements"),
    title: v.string(),
    time: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const { elementId, ...updates } = args;
    const element = await ctx.db.get(elementId);
    if (!element) throw new Error("Element not found");

    await ctx.db.patch(elementId, updates);

    const elements = await ctx.db
      .query("sessionElements")
      .withIndex("by_session", (q) => q.eq("sessionId", element.sessionId))
      .collect();

    const totalTime = elements.reduce((sum, el) => {
      return sum + (el._id === elementId ? args.time : el.time);
    }, 0);

    await ctx.db.patch(element.sessionId, { totalTime });
  },
});

export const reorderElement = mutation({
  args: {
    elementId: v.id("sessionElements"),
    newOrder: v.number(),
  },
  handler: async (ctx, args) => {
    const element = await ctx.db.get(args.elementId);
    if (!element) throw new Error("Element not found");

    const elements = await ctx.db
      .query("sessionElements")
      .withIndex("by_session", (q) => q.eq("sessionId", element.sessionId))
      .collect();

    const oldOrder = element.order;
    
    // Update orders of elements between old and new position
    for (const el of elements) {
      if (oldOrder < args.newOrder) {
        if (el.order > oldOrder && el.order <= args.newOrder) {
          await ctx.db.patch(el._id, { order: el.order - 1 });
        }
      } else {
        if (el.order >= args.newOrder && el.order < oldOrder) {
          await ctx.db.patch(el._id, { order: el.order + 1 });
        }
      }
    }

    await ctx.db.patch(args.elementId, { order: args.newOrder });
  },
});
