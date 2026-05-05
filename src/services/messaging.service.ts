// ============================================================
// A² Compass — Messaging Service
// In-app messaging between parents, teachers, and admin
// ============================================================
import { supabase } from './supabase';

export interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  subject: string | null;
  body: string;
  message_type: 'direct' | 'assignment' | 'lightbulb' | 'system';
  related_student_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  sender?: { first_name: string | null; last_name: string | null; role: string | null };
  recipient?: { first_name: string | null; last_name: string | null; role: string | null };
  related_student?: { first_name: string | null; last_name: string | null };
}

export interface SendMessageParams {
  recipientId: string;
  subject?: string;
  body: string;
  messageType?: 'direct' | 'assignment' | 'lightbulb' | 'system';
  relatedStudentId?: string;
}

export interface ConversationThread {
  partnerId: string;
  partnerName: string;
  partnerRole: string | null;
  lastMessage: Message;
  unreadCount: number;
  studentName?: string;
}

export const messagingService = {
  /**
   * Send a message
   */
  async sendMessage(params: SendMessageParams): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        recipient_id: params.recipientId,
        subject: params.subject || null,
        body: params.body,
        message_type: params.messageType || 'direct',
        related_student_id: params.relatedStudentId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Get inbox messages (received) with sender info
   */
  async getInbox(): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name, role),
        related_student:profiles!messages_related_student_id_fkey(first_name, last_name)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get sent messages with recipient info
   */
  async getSent(): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        recipient:profiles!messages_recipient_id_fkey(first_name, last_name, role),
        related_student:profiles!messages_related_student_id_fkey(first_name, last_name)
      `)
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get all messages for current user (both sent and received) 
   */
  async getAllMessages(): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name, role),
        recipient:profiles!messages_recipient_id_fkey(first_name, last_name, role),
        related_student:profiles!messages_related_student_id_fkey(first_name, last_name)
      `)
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Get conversation with a specific user
   */
  async getConversation(partnerId: string): Promise<Message[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles!messages_sender_id_fkey(first_name, last_name, role),
        recipient:profiles!messages_recipient_id_fkey(first_name, last_name, role),
        related_student:profiles!messages_related_student_id_fkey(first_name, last_name)
      `)
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${partnerId}),and(sender_id.eq.${partnerId},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', messageId);

    if (error) throw error;
  },

  /**
   * Mark all messages from a sender as read
   */
  async markConversationRead(partnerId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('sender_id', partnerId)
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
  },

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false);

    if (error) return 0;
    return count || 0;
  },

  /**
   * Get all contacts the user can message (parents for admin, admin/teacher for parents)
   */
  async getContacts(): Promise<Array<{ id: string; first_name: string | null; last_name: string | null; role: string | null; email: string | null }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get current user's role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (role === 'admin' || role === 'teacher') {
      // Admin/teacher can message parents and other staff
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, email')
        .in('role', ['parent', 'admin', 'teacher'])
        .neq('id', user.id)
        .eq('is_active', true);
      if (error) return [];
      return data || [];
    } else {
      // Parents can message admin and teachers
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role, email')
        .in('role', ['admin', 'teacher'])
        .eq('is_active', true);
      if (error) return [];
      return data || [];
    }
  },

  /**
   * Get students the user can associate with a message
   * (Admin/teacher: all students; Parent: own children)
   */
  async getStudentsList(): Promise<Array<{ id: string; user_id: string; first_name: string | null; last_name: string | null }>> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (role === 'admin' || role === 'teacher') {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('id, user_id, profiles!student_profiles_user_id_fkey(first_name, last_name)')
        .order('created_at');
      if (error) return [];
      return (data || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        first_name: s.profiles?.first_name,
        last_name: s.profiles?.last_name,
      }));
    } else {
      const { data, error } = await supabase
        .from('student_profiles')
        .select('id, user_id, profiles!student_profiles_user_id_fkey(first_name, last_name)')
        .eq('parent_id', user.id)
        .order('created_at');
      if (error) return [];
      return (data || []).map((s: any) => ({
        id: s.id,
        user_id: s.user_id,
        first_name: s.profiles?.first_name,
        last_name: s.profiles?.last_name,
      }));
    }
  },

  /**
   * Group messages into conversation threads
   */
  groupIntoThreads(messages: Message[], currentUserId: string): ConversationThread[] {
    const threadMap = new Map<string, { messages: Message[]; partner: any; studentName?: string }>();

    for (const msg of messages) {
      const partnerId = msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id;
      const partner = msg.sender_id === currentUserId ? msg.recipient : msg.sender;

      if (!threadMap.has(partnerId)) {
        threadMap.set(partnerId, { messages: [], partner, studentName: undefined });
      }
      const thread = threadMap.get(partnerId)!;
      thread.messages.push(msg);
      if (msg.related_student) {
        thread.studentName = [msg.related_student.first_name, msg.related_student.last_name].filter(Boolean).join(' ');
      }
    }

    const threads: ConversationThread[] = [];
    for (const [partnerId, { messages: msgs, partner, studentName }] of threadMap) {
      const sorted = msgs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const unreadCount = msgs.filter(m => m.recipient_id === currentUserId && !m.is_read).length;
      const partnerName = partner
        ? [partner.first_name, partner.last_name].filter(Boolean).join(' ') || 'Unknown'
        : 'Unknown';

      threads.push({
        partnerId,
        partnerName,
        partnerRole: partner?.role || null,
        lastMessage: sorted[0],
        unreadCount,
        studentName,
      });
    }

    // Sort by most recent message
    threads.sort((a, b) => new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime());
    return threads;
  },
};
