import { supabase } from "../services/db";
import { SharedItem, User, Rating } from "../services/db";

export interface SharedItemWithDetails extends SharedItem {
  sharedBy?: Pick<User, "id" | "name">;
  ratings?: Rating[];
}

export class SharedItemModel {
  /**
   * Create a new shared item
   */
  async create(
    data: Omit<SharedItem, "id" | "createdAt" | "updatedAt">
  ): Promise<SharedItemWithDetails | null> {
    const now = new Date().toISOString();

    const { data: newItem, error } = await supabase
      .from("SharedItem")
      .insert([
        {
          ...data,
          createdAt: now,
          updatedAt: now,
        },
      ])
      .select(
        `
        *,
        sharedBy:User!SharedItem_userId_fkey(id, name)
      `
      )
      .single();

    if (error || !newItem) return null;

    // Get ratings separately
    const { data: ratings } = await supabase
      .from("Rating")
      .select("*")
      .eq("itemId", newItem.id);

    return {
      ...newItem,
      ratings: ratings || [],
    } as SharedItemWithDetails;
  }

  /**
   * Get feed items with pagination
   */
  async getFeed(
    limit: number,
    cursor?: number
  ): Promise<{ items: SharedItemWithDetails[]; nextCursor?: number }> {
    let query = supabase
      .from("SharedItem")
      .select(
        `
        *,
        sharedBy:User!SharedItem_userId_fkey(*),
        ratings:Rating(*)
      `
      )
      .order("createdAt", { ascending: false })
      .limit(limit);

    if (cursor) {
      // For pagination, get items after the cursor
      query = query.lt("id", cursor);
    }

    const { data, error } = await query;

    if (error || !data) return { items: [] };

    const items = data as unknown as SharedItemWithDetails[];
    const nextCursor =
      items.length > 0 ? items[items.length - 1].id : undefined;

    return { items, nextCursor };
  }

  /**
   * Get a random shared item
   */
  async getRandom(): Promise<SharedItemWithDetails | null> {
    const { count, error: countError } = await supabase
      .from("SharedItem")
      .select("*", { count: "exact", head: true });

    if (countError || !count) return null;

    const randomOffset = Math.floor(Math.random() * count);
    const { data, error } = await supabase
      .from("SharedItem")
      .select(
        `
        *,
        sharedBy:User!SharedItem_userId_fkey(id, name),
        ratings:Rating(*)
      `
      )
      .range(randomOffset, randomOffset)
      .single();

    if (error || !data) return null;

    return data as unknown as SharedItemWithDetails;
  }

  /**
   * Update rating counts for an item
   */
  async updateRatingCounts(itemId: number): Promise<void> {
    const { count: yesCount } = await supabase
      .from("Rating")
      .select("*", { count: "exact", head: true })
      .eq("itemId", itemId)
      .eq("isPositive", true);

    const { count: noCount } = await supabase
      .from("Rating")
      .select("*", { count: "exact", head: true })
      .eq("itemId", itemId)
      .eq("isPositive", false);

    const totalCount = (yesCount || 0) + (noCount || 0);

    await supabase
      .from("SharedItem")
      .update({
        yes_count: yesCount || 0,
        no_count: noCount || 0,
        total_count: totalCount,
        updatedAt: new Date().toISOString(),
      })
      .eq("id", itemId);
  }
}

export const sharedItemRepository = new SharedItemModel();
