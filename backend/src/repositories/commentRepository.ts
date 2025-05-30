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

  /**
   * Check if a user can delete a comment (either their own comment or a comment on their post)
   */
  async canUserDeleteComment(commentId: number, userId: string): Promise<boolean> {
    const { data: comment, error } = await supabase
      .from("Comments")
      .select(`
        id,
        userId,
        sharedItemId,
        SharedItem!inner(userId)
      `)
      .eq("id", commentId)
      .single();

    if (error || !comment) return false;

    // User can delete if they are the comment author
    if (comment.userId === userId) return true;

    // User can delete if they own the post that the comment is on
    if (comment.SharedItem && comment.SharedItem[0]?.userId === userId) return true;

    return false;
  }

  /**
   * Get comment with post owner info for moderation
   */
  async getCommentWithPostOwner(commentId: number): Promise<any | null> {
    const { data, error } = await supabase
      .from("Comments")
      .select(`
        *,
        User(id, name),
        SharedItem(id, title, userId)
      `)
      .eq("id", commentId)
      .single();

    if (error || !data) return null;
    return data;
  }
}

export const commentRepository = new CommentModel();
