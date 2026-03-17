import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import * as contentService from '../../../services/content.service';
import type { StudentAssignment, StudentSubmission, Activity, DiscussionPost } from '../../../types/content';

export default function ActivityPlayer() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignment, setAssignment] = useState<StudentAssignment | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => { if (assignmentId) loadAssignment(); }, [assignmentId]);

  async function loadAssignment() {
    setLoading(true);
    try {
      // For now, load from getStudentAssignments and find the match
      // In production, we'd have a getAssignment(id) call
      if (!user) return;
      const allAssignments = await contentService.getStudentAssignments(user.id);
      const found = allAssignments.find(a => a.id === assignmentId);
      if (found) {
        setAssignment(found);
        if (found.activity) setActivity(found.activity);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleSubmit(content: Record<string, any>, answers?: any[]) {
    if (!assignmentId || !user) return;
    setSubmitting(true);
    try {
      await contentService.createSubmission(assignmentId, user.id, {
        submission_type: 'response',
        content,
        answers: answers || [],
        time_spent_seconds: Math.floor((Date.now() - startTime) / 1000),
        is_final: true,
      } as Partial<StudentSubmission>);
      navigate('/student/flight-plan');
    } catch (err) { console.error(err); }
    finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-500">Loading activity...</div>;
  if (!assignment || !activity) return <div className="text-center py-12"><p className="text-gray-500">Activity not found</p><button onClick={() => navigate('/student/flight-plan')} className="mt-3 text-blue-600 hover:underline">Back to Flight Plan</button></div>;

  const formatSlug = activity.learning_format?.slug || '';

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => navigate('/student/flight-plan')} className="text-sm text-blue-600 hover:underline mb-4">← Back to Flight Plan</button>
      
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <FormatIcon slug={formatSlug} />
          <div>
            <h1 className="text-xl font-bold">{activity.title}</h1>
            <div className="flex gap-3 text-sm text-gray-500">
              {activity.subject && <span>{activity.subject.icon} {activity.subject.name}</span>}
              {activity.learning_format && <span>{activity.learning_format.name}</span>}
              <span>⏱ ~{activity.estimated_minutes} min</span>
            </div>
          </div>
        </div>
        {activity.description && <p className="text-gray-600 mb-4">{activity.description}</p>}
        
        {assignment.status === 'graded' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-green-800">Score: {assignment.percentage?.toFixed(0)}%</span>
              {assignment.mastery_met && <span className="text-yellow-500">⭐ Mastery!</span>}
            </div>
            {assignment.feedback && <p className="text-sm text-green-700 mt-1">{assignment.feedback}</p>}
          </div>
        )}
      </div>

      {/* Format-specific renderer */}
      {formatSlug === 'practice-arena' && <PracticeArenaPlayer config={activity.config} onSubmit={handleSubmit} submitting={submitting} graded={assignment.status === 'graded'} />}
      {formatSlug === 'discussion-board' && <DiscussionBoardPlayer activity={activity} userId={user?.id || ''} />}
      {formatSlug === 'choice-board' && <ChoiceBoardPlayer config={activity.config} onSubmit={handleSubmit} submitting={submitting} />}
      {formatSlug === 'independent-project' && <ProjectPlayer config={activity.config} onSubmit={handleSubmit} submitting={submitting} />}
      {(formatSlug === 'live-seminar' || formatSlug === 'one-on-one') && <SessionPlayer config={activity.config} format={formatSlug} />}
      {formatSlug === 'partner-quest' && <PartnerQuestPlayer config={activity.config} onSubmit={handleSubmit} submitting={submitting} />}
    </div>
  );
}

function FormatIcon({ slug }: { slug: string }) {
  const icons: Record<string, string> = { 'live-seminar': '🎥', 'discussion-board': '💬', 'choice-board': '🎯', 'independent-project': '📋', 'partner-quest': '🤝', 'one-on-one': '👤', 'practice-arena': '⚔️' };
  return <span className="text-3xl">{icons[slug] || '📄'}</span>;
}

// ==========================================
// PRACTICE ARENA PLAYER
// ==========================================
function PracticeArenaPlayer({ config, onSubmit, submitting, graded }: { config: any; onSubmit: (c: any, a: any[]) => void; submitting: boolean; graded: boolean }) {
  const questions = config.questions || [];
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  function handleAnswer(qId: string, answer: string) { setAnswers(prev => ({ ...prev, [qId]: answer })); }

  function handleSubmit() {
    let correct = 0;
    const answersList = questions.map((q: any) => {
      const isCorrect = (answers[q.id] || '').toLowerCase().trim() === q.correct_answer.toLowerCase().trim();
      if (isCorrect) correct++;
      return { question_id: q.id, answer: answers[q.id] || '', correct: isCorrect, points: isCorrect ? q.points : 0 };
    });
    const totalPoints = questions.reduce((s: number, q: any) => s + q.points, 0);
    setScore(Math.round((correct / questions.length) * 100));
    setShowResults(true);
    onSubmit({ score: correct, total: questions.length, percentage: (correct / questions.length) * 100 }, answersList);
  }

  if (graded) return <div className="bg-white rounded-lg shadow p-6 text-center"><p className="text-gray-500">This assessment has been graded. Check your score above.</p></div>;

  return (
    <div className="space-y-4">
      {config.time_limit_min && <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm text-yellow-800">⏱ Time limit: {config.time_limit_min} minutes | Passing score: {config.passing_score || 85}%</div>}
      
      {questions.map((q: any, i: number) => (
        <div key={q.id} className="bg-white rounded-lg shadow p-6">
          <p className="font-medium mb-3">{i + 1}. {q.question}</p>
          
          {q.type === 'multiple_choice' && (
            <div className="space-y-2">
              {(q.options || []).map((opt: string, oi: number) => (
                <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${answers[q.id] === opt ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'} ${showResults ? (opt === q.correct_answer ? 'border-green-500 bg-green-50' : answers[q.id] === opt ? 'border-red-500 bg-red-50' : '') : ''}`}>
                  <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => handleAnswer(q.id, opt)} disabled={showResults} />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          )}
          
          {q.type === 'true_false' && (
            <div className="flex gap-4">
              {['True', 'False'].map(val => (
                <label key={val} className={`flex-1 p-3 text-center rounded-lg border cursor-pointer ${answers[q.id] === val ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <input type="radio" name={q.id} value={val} checked={answers[q.id] === val} onChange={() => handleAnswer(q.id, val)} disabled={showResults} className="sr-only" />
                  {val}
                </label>
              ))}
            </div>
          )}
          
          {(q.type === 'short_answer' || q.type === 'fill_blank') && (
            <input type="text" value={answers[q.id] || ''} onChange={e => handleAnswer(q.id, e.target.value)} disabled={showResults} placeholder="Type your answer..." className="w-full px-3 py-2 border rounded-lg" />
          )}
          
          {showResults && q.explanation && <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">💡 {q.explanation}</p>}
        </div>
      ))}
      
      {!showResults && questions.length > 0 && (
        <button onClick={handleSubmit} disabled={submitting || Object.keys(answers).length < questions.length} className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
          {submitting ? 'Submitting...' : 'Submit Answers'}
        </button>
      )}
      
      {showResults && (
        <div className={`text-center p-6 rounded-lg ${score >= (config.passing_score || 85) ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
          <p className="text-3xl font-bold mb-1">{score}%</p>
          <p className="text-sm">{score >= (config.passing_score || 85) ? '⭐ Mastery achieved!' : 'Keep practicing — you\'ll get there!'}</p>
        </div>
      )}
    </div>
  );
}

// ==========================================
// DISCUSSION BOARD PLAYER
// ==========================================
function DiscussionBoardPlayer({ activity, userId }: { activity: Activity; userId: string }) {
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [newPost, setNewPost] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => { loadPosts(); }, []);

  async function loadPosts() {
    const data = await contentService.getDiscussionPosts(activity.id);
    setPosts(data);
  }

  async function handlePost() {
    if (!newPost.trim()) return;
    setPosting(true);
    await contentService.createDiscussionPost(activity.id, userId, newPost);
    setNewPost(''); setPosting(false); loadPosts();
  }

  async function handleReply(parentId: string) {
    if (!replyContent.trim()) return;
    setPosting(true);
    await contentService.createDiscussionPost(activity.id, userId, replyContent, parentId);
    setReplyContent(''); setReplyTo(null); setPosting(false); loadPosts();
  }

  const config = activity.config || {};

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-800 mb-1">Discussion Prompt</h3>
        <p className="text-blue-700">{config.prompt || 'Share your thoughts!'}</p>
        {config.word_minimum && <p className="text-xs text-blue-600 mt-1">Minimum {config.word_minimum} words · {config.peer_response_count || 2} peer response(s) required</p>}
      </div>
      
      <div className="bg-white rounded-lg shadow p-4">
        <textarea value={newPost} onChange={e => setNewPost(e.target.value)} rows={4} placeholder="Share your response..." className="w-full px-3 py-2 border rounded-lg" />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">{newPost.split(/\s+/).filter(Boolean).length} words</span>
          <button onClick={handlePost} disabled={posting || !newPost.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">Post</button>
        </div>
      </div>
      
      <div className="space-y-3">
        {posts.map(post => (
          <div key={post.id} className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium text-sm">{post.author?.first_name} {post.author?.last_name}</span>
              <span className="text-xs text-gray-400">{new Date(post.created_at).toLocaleDateString()}</span>
            </div>
            <p className="text-sm mb-2">{post.content}</p>
            <button onClick={() => setReplyTo(replyTo === post.id ? null : post.id)} className="text-xs text-blue-600 hover:underline">Reply ({post.replies?.length || 0})</button>
            
            {post.replies?.map(reply => (
              <div key={reply.id} className="ml-6 mt-2 pl-3 border-l-2 border-gray-200">
                <span className="text-xs font-medium">{reply.author?.first_name} {reply.author?.last_name}</span>
                <p className="text-sm">{reply.content}</p>
              </div>
            ))}
            
            {replyTo === post.id && (
              <div className="mt-2 ml-6 flex gap-2">
                <input type="text" value={replyContent} onChange={e => setReplyContent(e.target.value)} placeholder="Write a reply..." className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <button onClick={() => handleReply(post.id)} disabled={posting} className="px-3 py-2 bg-blue-600 text-white rounded text-sm">Reply</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==========================================
// CHOICE BOARD PLAYER
// ==========================================
function ChoiceBoardPlayer({ config, onSubmit, submitting }: { config: any; onSubmit: (c: any) => void; submitting: boolean }) {
  const choices = config.choices || [];
  const [selected, setSelected] = useState<number[]>([]);
  const [responses, setResponses] = useState<Record<number, string>>({});

  function toggleChoice(idx: number) {
    setSelected(prev => {
      if (prev.includes(idx)) return prev.filter(i => i !== idx);
      if (prev.length >= (config.max_choices || choices.length)) return prev;
      return [...prev, idx];
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">Select {config.min_choices || 1}–{config.max_choices || choices.length} activities:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {choices.map((choice: any, i: number) => (
          <div key={i} onClick={() => toggleChoice(i)} className={`rounded-lg border-2 p-4 cursor-pointer transition-all ${selected.includes(i) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <h3 className="font-medium mb-1">{choice.title}</h3>
            <p className="text-sm text-gray-600">{choice.instructions}</p>
            {selected.includes(i) && (
              <textarea value={responses[i] || ''} onChange={e => { e.stopPropagation(); setResponses(prev => ({ ...prev, [i]: e.target.value })); }} onClick={e => e.stopPropagation()} rows={3} placeholder="Your response..." className="w-full mt-3 px-3 py-2 border rounded-lg text-sm" />
            )}
          </div>
        ))}
      </div>
      <button onClick={() => onSubmit({ selected_choices: selected.map(i => choices[i]?.title), responses })} disabled={submitting || selected.length < (config.min_choices || 1)} className="w-full py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50">Submit</button>
    </div>
  );
}

// ==========================================
// PROJECT PLAYER
// ==========================================
function ProjectPlayer({ config, onSubmit, submitting }: { config: any; onSubmit: (c: any) => void; submitting: boolean }) {
  const [response, setResponse] = useState('');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-medium mb-2">Project Brief</h3>
        <p className="text-gray-700 whitespace-pre-wrap">{config.prompt}</p>
      </div>
      {config.milestones?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-3">Milestones</h3>
          <div className="space-y-2">
            {config.milestones.map((m: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                <div><p className="font-medium text-sm">{m.title}</p><p className="text-xs text-gray-500">{m.description}</p></div>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-medium mb-2">Your Submission</h3>
        <textarea value={response} onChange={e => setResponse(e.target.value)} rows={8} placeholder="Write your project response..." className="w-full px-3 py-2 border rounded-lg" />
        <button onClick={() => onSubmit({ response })} disabled={submitting || !response.trim()} className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Submit Project</button>
      </div>
    </div>
  );
}

// ==========================================
// SESSION PLAYER (Live Seminar / One-on-One)
// ==========================================
function SessionPlayer({ config, format }: { config: any; format: string }) {
  const isUpcoming = config.scheduled_at && new Date(config.scheduled_at) > new Date();

  return (
    <div className="bg-white rounded-lg shadow p-6 text-center">
      <p className="text-4xl mb-3">{format === 'live-seminar' ? '🎥' : '👤'}</p>
      <h2 className="text-lg font-semibold mb-2">{format === 'live-seminar' ? 'Live Seminar' : 'One-on-One Coaching'}</h2>
      {config.scheduled_at && <p className="text-gray-600 mb-3">Scheduled: {new Date(config.scheduled_at).toLocaleString()}</p>}
      {config.duration_min && <p className="text-sm text-gray-500 mb-4">Duration: {config.duration_min} minutes</p>}
      {config.meeting_url ? (
        <a href={config.meeting_url} target="_blank" rel="noopener noreferrer" className={`inline-block px-6 py-3 rounded-lg font-medium ${isUpcoming ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500'}`}>
          {isUpcoming ? 'Join Session →' : 'Session Ended'}
        </a>
      ) : (
        <p className="text-gray-400">Meeting link will be shared before the session</p>
      )}
      {config.focus_areas?.length > 0 && (
        <div className="mt-4 text-left">
          <h3 className="text-sm font-medium mb-1">Focus Areas:</h3>
          <ul className="list-disc list-inside text-sm text-gray-600">{config.focus_areas.map((f: string, i: number) => <li key={i}>{f}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ==========================================
// PARTNER QUEST PLAYER
// ==========================================
function PartnerQuestPlayer({ config, onSubmit, submitting }: { config: any; onSubmit: (c: any) => void; submitting: boolean }) {
  const [response, setResponse] = useState('');

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">🤝</span>
          <h3 className="font-medium">Partner Quest — Work with {config.partner_count || 2} partner(s)</h3>
        </div>
        <p className="text-gray-700 whitespace-pre-wrap">{config.instructions}</p>
      </div>
      {config.deliverables?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-medium mb-3">Deliverables</h3>
          {config.deliverables.map((d: any, i: number) => (
            <div key={i} className="p-3 bg-gray-50 rounded-lg mb-2">
              <p className="font-medium text-sm">{d.title}</p>
              <p className="text-xs text-gray-500">{d.description}</p>
            </div>
          ))}
        </div>
      )}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-medium mb-2">Your Response</h3>
        <textarea value={response} onChange={e => setResponse(e.target.value)} rows={6} placeholder="Describe your work with your partner(s)..." className="w-full px-3 py-2 border rounded-lg" />
        <button onClick={() => onSubmit({ response })} disabled={submitting || !response.trim()} className="mt-3 px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">Submit</button>
      </div>
    </div>
  );
}
