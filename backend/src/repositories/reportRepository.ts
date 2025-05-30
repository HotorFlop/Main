import { supabase } from "../services/db";
import { Report } from "../services/db";

export class ReportModel {
  /**
   * Create a new report
   */
  async create(
    data: Omit<Report, "id" | "created_at" | "status" | "reviewed_by" | "reviewed_at">
  ): Promise<Report | null> {
    const { data: newReport, error } = await supabase
      .from("Reports")
      .insert([{
        ...data,
        status: 'pending'
      }])
      .select()
      .single();

    if (error || !newReport) return null;
    return newReport as Report;
  }

  /**
   * Get reports by status
   */
  async getByStatus(status: string): Promise<Report[]> {
    const { data, error } = await supabase
      .from("Reports")
      .select(
        `
        *,
        reporter:User!Reports_reporter_id_fkey(id, username),
        reported_item:SharedItem(id, title),
        reported_comment:Comments(id, comment),
        reported_user:User!Reports_reported_user_id_fkey(id, username)
      `
      )
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data as Report[];
  }

  /**
   * Update report status
   */
  async updateStatus(
    id: number, 
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed',
    reviewedBy?: string
  ): Promise<boolean> {
    const updateData: any = { 
      status,
      reviewed_at: new Date().toISOString()
    };
    
    if (reviewedBy) {
      updateData.reviewed_by = reviewedBy;
    }

    const { error } = await supabase
      .from("Reports")
      .update(updateData)
      .eq("id", id);

    return !error;
  }
}

export const reportRepository = new ReportModel(); 