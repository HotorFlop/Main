import { supabase } from "../services/db";
import { User } from "../services/db";

export class UserModel {
  /**
   * Find a user by their ID
   */
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return data as User;
  }

  /**
   * Find a user by their email
   */
  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from("User")
      .select("*")
      .eq("email", email)
      .single();

    if (error || !data) return null;
    return data as User;
  }

  /**
   * Create a new user
   */
  async create(user: Omit<User, "id">): Promise<User | null> {
    const { data, error } = await supabase
      .from("User")
      .insert([user])
      .select()
      .single();

    if (error || !data) return null;
    return data as User;
  }

  /**
   * Update an existing user
   */
  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const { data, error } = await supabase
      .from("User")
      .update(userData)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) return null;
    return data as User;
  }
}

export const userRepository = new UserModel();
