import { supabase } from "../services/db";
import { Comment } from "../services/db";

export class CommentModel {
  /**
   * Create a new comment
   */
  async create(
    data: Omit<Comment, "id" | "created_at">
  ): Promise<Comment | null> {
    const { data: newComment, error } = await supabase
      .from("Comments")
      .insert([data])
      .select()
      .single();

    if (error || !newComment) return null;
    return newComment as Comment;
  }

  /**
   * Get comments for a shared item
   */
  async getBySharedItemId(sharedItemId: number): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("Comments")
      .select(
        `
        *,
        User(id, name)
      `
      )
      .eq("sharedItemId", sharedItemId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Comment[];
  }

  /**
   * Get comments by user
   */
  async getByUserId(userId: string): Promise<Comment[]> {
    const { data, error } = await supabase
      .from("Comments")
      .select(
        `
        *,
        SharedItem(id, title)
      `
      )
      .eq("userId", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Comment[];
  }

  /**
   * Delete a comment
   */
  async delete(id: number): Promise<boolean> {
    const { error } = await supabase.from("Comments").delete().eq("id", id);

    return !error;
  }
}

export const commentRepository = new CommentModel();
