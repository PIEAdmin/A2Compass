import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../hooks';
import { messagingService, type Message, type ConversationThread } from '../../services/messaging.service';

/* ── Helpers ──────────────────────────────────────────────────── */
function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function roleBadge(role: string | null): string {
  switch (role) {
    case 'admin': return '👑';
    case 'teacher': return '👩‍🏫';
    case 'parent': return '👪';
    case 'student': return '🎒';
    default: return '';
  }
}

function roleLabel(role: string | null): string {
  if (!role) return '';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/* ── Compose Modal ───────────────────────────────────────────── */
interface ComposeProps {
  onClose: () => void;
  onSent: () => void;
  replyTo?: { recipientId: string; recipientName: string; subject?: string };
}

function ComposeModal({ onClose, onSent, replyTo }: ComposeProps) {
  const [contacts, setContacts] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; role: string | null }>>([]);
  const [students, setStudents] = useState<Array<{ id: string; user_id: string; first_name: string | null; last_name: string | null }>>([]);
  const [recipientId, setRecipientId] = useState(replyTo?.recipientId || '');
  const [subject, setSubject] = useState(replyTo?.subject ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [messageType, setMessageType] = useState<'direct' | 'assignment' | 'lightbulb'>('direct');
  const [relatedStudentId, setRelatedStudentId] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      messagingService.getContacts(),
      messagingService.getStudentsList(),
    ]).then(([c, s]) => {
      setContacts(c);
      setStudents(s);
    });
  }, []);

  async function handleSend() {
    if (!recipientId || !body.trim()) {
      setError('Please select a recipient and write a message.');
      return;
    }
    setSending(true);
    setError('');
    try {
      await messagingService.sendMessage({
        recipientId,
        subject: subject || undefined,
        body: body.trim(),
        messageType,
        relatedStudentId: relatedStudentId || undefined,
      });
      onSent();
    } catch (err: any) {
      console.error('Send error:', err);
      setError(err.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {messageType === 'assignment' ? '📝 Send Extra Work' : messageType === 'lightbulb' ? '💡 Lightbulb Moment' : '✉️ New Message'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Message Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message Type</label>
            <div className="flex gap-2">
              {([
                { value: 'direct', label: '✉️ Message', desc: 'General message' },
                { value: 'assignment', label: '📝 Extra Work', desc: 'Send assignment' },
                { value: 'lightbulb', label: '💡 Lightbulb', desc: 'Milestone alert' },
              ] as const).map(t => (
                <button
                  key={t.value}
                  onClick={() => setMessageType(t.value)}
                  className={`flex-1 p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                    messageType === t.value
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <div>{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
            <select
              value={recipientId}
              onChange={e => setRecipientId(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select recipient…</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {roleBadge(c.role)} {[c.first_name, c.last_name].filter(Boolean).join(' ') || 'Unknown'} ({roleLabel(c.role)})
                </option>
              ))}
            </select>
          </div>

          {/* Related Student (optional) */}
          {students.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Related Student <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={relatedStudentId}
                onChange={e => setRelatedStudentId(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">None</option>
                {students.map(s => (
                  <option key={s.user_id} value={s.user_id}>
                    {[s.first_name, s.last_name].filter(Boolean).join(' ') || 'Student'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={messageType === 'assignment' ? 'Extra practice: Math addition' : messageType === 'lightbulb' ? '💡 Milestone reached!' : 'Subject…'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={5}
              placeholder={
                messageType === 'assignment'
                  ? 'Describe the extra work you would like the student to complete...'
                  : messageType === 'lightbulb'
                  ? 'Share the exciting milestone this student has reached!'
                  : 'Write your message…'
              }
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !recipientId || !body.trim()}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? 'Sending…' : messageType === 'assignment' ? '📝 Send Assignment' : '✉️ Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Inbox Component ────────────────────────────────────── */
export default function Inbox() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [threads, setThreads] = useState<ConversationThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [replyTo, setReplyTo] = useState<{ recipientId: string; recipientName: string; subject?: string } | undefined>();
  const [tab, setTab] = useState<'inbox' | 'sent'>('inbox');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMessages();
  }, [user]);

  async function loadMessages() {
    if (!user) return;
    setLoading(true);
    try {
      const allMsgs = await messagingService.getAllMessages();
      setMessages(allMsgs);
      const grouped = messagingService.groupIntoThreads(allMsgs, user.id);
      setThreads(grouped);
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoading(false);
    }
  }

  async function openThread(partnerId: string) {
    setSelectedThread(partnerId);
    try {
      const convo = await messagingService.getConversation(partnerId);
      setConversation(convo);
      // Mark as read
      await messagingService.markConversationRead(partnerId);
      // Refresh threads to update unread counts
      const allMsgs = await messagingService.getAllMessages();
      setMessages(allMsgs);
      setThreads(messagingService.groupIntoThreads(allMsgs, user!.id));
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  }

  useEffect(() => {
    // Auto-scroll to bottom of conversation
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  function handleComposeDone() {
    setShowCompose(false);
    setReplyTo(undefined);
    loadMessages();
  }

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);
  const selectedPartner = threads.find(t => t.partnerId === selectedThread);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="p-4 sm:p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              💬 Messages
              {totalUnread > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {totalUnread}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Communicate with parents, teachers, and staff
            </p>
          </div>
          <button
            onClick={() => { setReplyTo(undefined); setShowCompose(true); }}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            ✉️ New Message
          </button>
        </div>

        {/* Main Grid — Thread List + Conversation */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex" style={{ minHeight: '500px' }}>
          {/* ── Thread List (Left Panel) ── */}
          <div className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedThread ? 'hidden md:flex' : 'flex'}`}>
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setTab('inbox')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === 'inbox'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Inbox {totalUnread > 0 && <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-xs rounded-full">{totalUnread}</span>}
              </button>
              <button
                onClick={() => setTab('sent')}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  tab === 'sent'
                    ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Sent
              </button>
            </div>

            {/* Thread Items */}
            <div className="flex-1 overflow-y-auto">
              {threads.length === 0 ? (
                <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                  <p className="text-4xl mb-2">📭</p>
                  <p className="text-sm">No messages yet</p>
                  <p className="text-xs mt-1">Send a message to get started!</p>
                </div>
              ) : (
                threads.map(thread => (
                  <button
                    key={thread.partnerId}
                    onClick={() => openThread(thread.partnerId)}
                    className={`w-full text-left p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      selectedThread === thread.partnerId ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
                        thread.unreadCount > 0
                          ? 'bg-indigo-100 dark:bg-indigo-900'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {roleBadge(thread.partnerRole) || '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${
                            thread.unreadCount > 0
                              ? 'font-bold text-gray-900 dark:text-white'
                              : 'font-medium text-gray-700 dark:text-gray-300'
                          }`}>
                            {thread.partnerName}
                          </p>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0 ml-2">
                            {formatTime(thread.lastMessage.created_at)}
                          </span>
                        </div>
                        {thread.lastMessage.subject && (
                          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                            {thread.lastMessage.message_type === 'assignment' ? '📝 ' : thread.lastMessage.message_type === 'lightbulb' ? '💡 ' : ''}
                            {thread.lastMessage.subject}
                          </p>
                        )}
                        <p className={`text-xs truncate mt-0.5 ${
                          thread.unreadCount > 0
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-400 dark:text-gray-500'
                        }`}>
                          {thread.lastMessage.sender_id === user?.id ? 'You: ' : ''}
                          {thread.lastMessage.body}
                        </p>
                        {thread.studentName && (
                          <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5">
                            Re: {thread.studentName}
                          </p>
                        )}
                      </div>
                      {thread.unreadCount > 0 && (
                        <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── Conversation View (Right Panel) ── */}
          <div className={`flex-1 flex flex-col ${selectedThread ? 'flex' : 'hidden md:flex'}`}>
            {!selectedThread ? (
              <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <div className="text-center">
                  <p className="text-5xl mb-3">💬</p>
                  <p className="font-medium">Select a conversation</p>
                  <p className="text-sm mt-1">or start a new message</p>
                </div>
              </div>
            ) : (
              <>
                {/* Conversation Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedThread(null)}
                    className="md:hidden text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    ←
                  </button>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-sm">
                    {roleBadge(selectedPartner?.partnerRole) || '👤'}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 dark:text-white text-sm">
                      {selectedPartner?.partnerName || 'Unknown'}
                    </p>
                    {selectedPartner?.partnerRole && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{roleLabel(selectedPartner.partnerRole)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setReplyTo({
                        recipientId: selectedThread,
                        recipientName: selectedPartner?.partnerName || '',
                        subject: conversation[conversation.length - 1]?.subject || undefined,
                      });
                      setShowCompose(true);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Reply
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {conversation.map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                          isMine
                            ? 'bg-indigo-600 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                        }`}>
                          {msg.message_type !== 'direct' && (
                            <p className={`text-xs font-semibold mb-1 ${isMine ? 'text-indigo-200' : 'text-indigo-500 dark:text-indigo-400'}`}>
                              {msg.message_type === 'assignment' ? '📝 Assignment' : msg.message_type === 'lightbulb' ? '💡 Lightbulb Moment' : '🔔 System'}
                            </p>
                          )}
                          {msg.subject && (
                            <p className={`text-xs font-bold mb-1 ${isMine ? 'text-indigo-100' : 'text-gray-700 dark:text-gray-300'}`}>
                              {msg.subject}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                          {msg.related_student && (
                            <p className={`text-xs mt-1 ${isMine ? 'text-indigo-200' : 'text-indigo-500 dark:text-indigo-400'}`}>
                              👤 {[msg.related_student.first_name, msg.related_student.last_name].filter(Boolean).join(' ')}
                            </p>
                          )}
                          <p className={`text-xs mt-1 ${isMine ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}>
                            {formatTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply */}
                <QuickReply
                  recipientId={selectedThread}
                  onSent={() => openThread(selectedThread)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <ComposeModal
          onClose={() => { setShowCompose(false); setReplyTo(undefined); }}
          onSent={handleComposeDone}
          replyTo={replyTo}
        />
      )}
    </div>
  );
}

/* ── Quick Reply Bar ─────────────────────────────────────────── */
function QuickReply({ recipientId, onSent }: { recipientId: string; onSent: () => void }) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (!body.trim()) return;
    setSending(true);
    try {
      await messagingService.sendMessage({
        recipientId,
        body: body.trim(),
      });
      setBody('');
      onSent();
    } catch (err) {
      console.error('Quick reply error:', err);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-end gap-2">
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message… (Enter to send)"
        rows={1}
        className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
        style={{ maxHeight: '100px' }}
      />
      <button
        onClick={handleSend}
        disabled={sending || !body.trim()}
        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {sending ? '…' : 'Send'}
      </button>
    </div>
  );
}
