import { supabase } from "./supabase";

// Base API URL - adjust as needed
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

console.log("Moderation API URL:", API_BASE_URL);

export const moderationAPI = {
  // Report a post
  reportPost: async (postId: number, reason: string, description?: string, token?: string) => {
    // Get token from parameter or try to get from session
    let authToken = token;
    if (!authToken) {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    }
    
    if (!authToken) throw new Error("Authentication required");

    const response = await fetch(`${API_BASE_URL}/reports/post`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        postId,
        reason,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to report post");
    }

    return response.json();
  },

  // Report a comment
  reportComment: async (commentId: number, reason: string, description?: string, token?: string) => {
    // Get token from parameter or try to get from session
    let authToken = token;
    if (!authToken) {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    }
    
    if (!authToken) throw new Error("Authentication required");

    const response = await fetch(`${API_BASE_URL}/reports/comment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        commentId,
        reason,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to report comment");
    }

    return response.json();
  },

  // Report a user
  reportUser: async (userId: string, reason: string, description?: string, token?: string) => {
    // Get token from parameter or try to get from session
    let authToken = token;
    if (!authToken) {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    }
    
    if (!authToken) throw new Error("Authentication required");

    const response = await fetch(`${API_BASE_URL}/reports/user`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        userId,
        reason,
        description,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to report user");
    }

    return response.json();
  },

  // Delete a comment
  deleteComment: async (commentId: number, token?: string) => {
    // Get token from parameter or try to get from session
    let authToken = token;
    if (!authToken) {
      const { data: { session } } = await supabase.auth.getSession();
      authToken = session?.access_token;
    }
    
    if (!authToken) throw new Error("Authentication required");

    const response = await fetch(`${API_BASE_URL}/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to delete comment");
    }

    return response.json();
  },
}; 