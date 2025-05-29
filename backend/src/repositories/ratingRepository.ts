import { supabase } from "../services/db";
import { Rating } from "../services/db";
import { sharedItemRepository } from "./sharedItemRepository";

export class RatingModel {
  /**
   * Upsert a rating (create or update)
   */
  async upsert(
    userId: number,
    itemId: number,
    isPositive: boolean
  ): Promise<Rating | null> {
    // Check if rating exists
    const { data: existingRating } = await supabase
      .from("Rating")
      .select("*")
      .eq("userId", userId)
      .eq("itemId", itemId)
      .single();

    let result;

    if (existingRating) {
      // Update existing rating
      const { data, error } = await supabase
        .from("Rating")
        .update({ isPositive })
        .eq("userId", userId)
        .eq("itemId", itemId)
        .select()
        .single();

      if (error) return null;
      result = data as Rating;
    } else {
      // Create new rating
      const { data, error } = await supabase
        .from("Rating")
        .insert([
          {
            userId,
            itemId,
            isPositive,
          },
        ])
        .select()
        .single();

      if (error) return null;
      result = data as Rating;
    }

    // Update item rating counts
    await sharedItemRepository.updateRatingCounts(itemId);

    return result;
  }

  /**
   * Get ratings for an item
   */
  async getByItemId(itemId: number): Promise<Rating[]> {
    const { data, error } = await supabase
      .from("Rating")
      .select("*")
      .eq("itemId", itemId);

    if (error || !data) return [];
    return data as Rating[];
  }

  /**
   * Get a user's rating for an item
   */
  async getByUserAndItem(
    userId: number,
    itemId: number
  ): Promise<Rating | null> {
    const { data, error } = await supabase
      .from("Rating")
      .select("*")
      .eq("userId", userId)
      .eq("itemId", itemId)
      .single();

    if (error || !data) return null;
    return data as Rating;
  }
}

export const ratingRepository = new RatingModel();
