'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  IconGraduate, IconCheck, IconStar, IconChevron, IconLock,
} from '@/components/Icons';
import { RewardToast } from '@/components/RewardToast';
import { AuthPrompt } from '@/components/AuthPrompt';

interface Lesson {
  id: number;
  slug: string;
  title: string;
  content: string;
  orderIndex: number;
  xpReward: number;
}

interface Course {
  id: number;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  pointsReward: number;
  xpReward: number;
  pillar: string;
  estimatedMinutes: number;
  lessons: Lesson[];
}

interface Enrollment {
  courseId: number;
  completedAt: string | null;
}

interface LessonProgressEntry {
  lessonId: number;
}

const DIFFICULTY_STYLE: Record<string, { label: string; bg: string; text: string }> = {
  beginner: { label: 'Beginner', bg: 'rgba(52, 211, 153, 0.15)', text: 'var(--accent)' },
  intermediate: { label: 'Intermediate', bg: 'rgba(167, 139, 250, 0.15)', text: 'var(--secondary)' },
  advanced: { label: 'Advanced', bg: 'rgba(251, 191, 36, 0.15)', text: 'var(--warn)' },
};

const COURSE_GRADIENTS: Record<string, string> = {
  'tree-identification-fundamentals': 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
  'photographing-plants-for-ai': 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
  'phenology-observation': 'linear-gradient(135deg, #713f12 0%, #854d0e 50%, #a16207 100%)',
  'tree-health-assessment': 'linear-gradient(135deg, #1a2e05 0%, #365314 50%, #4d7c0f 100%)',
  'fruit-quality-evaluation': 'linear-gradient(135deg, #4c0519 0%, #881337 50%, #be123c 100%)',
  'species-verification-and-community-science': 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
};

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [course, setCourse] = useState<Course | null>(null);
  const [enrolled, setEnrolled] = useState(false);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [courseCompleted, setCourseCompleted] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [completing, setCompleting] = useState<number | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rewards, setRewards] = useState<{
    xpAwarded: number;
    newAchievements: { key: string; title: string; icon: string; description: string }[];
    completedChallenges: string[];
    currentStreak: number;
  } | null>(null);

  const fetchCourse = useCallback(async () => {
    try {
      const res = await fetch(`/api/lms/courses/${slug}`);
      const json = await res.json();
      if (json.success && json.data) {
        setCourse(json.data);
      } else if (json.id) {
        setCourse(json);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [slug]);

  const fetchProgress = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/lms/user-progress');
      const json = await res.json();
      if (json.success && json.data) {
        const enrollment = (json.data.enrollments || []).find(
          (e: Enrollment) => course && e.courseId === course.id
        );
        if (enrollment) {
          setEnrolled(true);
          setCourseCompleted(!!enrollment.completedAt);
        }
        const completed = new Set<number>(
          (json.data.lessonProgress || []).map((lp: LessonProgressEntry) => lp.lessonId)
        );
        setCompletedLessons(completed);
      }
    } catch { /* ignore */ }
  }, [session, course]);

  useEffect(() => { fetchCourse(); }, [fetchCourse]);
  useEffect(() => { if (course) fetchProgress(); }, [course, fetchProgress]);

  // Auto-expand first incomplete lesson
  useEffect(() => {
    if (!course || !enrolled) return;
    const sorted = [...course.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
    const firstIncomplete = sorted.find(l => !completedLessons.has(l.id));
    if (firstIncomplete) setExpandedLesson(firstIncomplete.id);
    else if (sorted.length) setExpandedLesson(sorted[sorted.length - 1].id);
  }, [course, enrolled, completedLessons]);

  const handleEnroll = async () => {
    if (!course) return;
    setEnrolling(true);
    try {
      const res = await fetch('/api/lms/enroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: course.id }),
      });
      const json = await res.json();
      if (json.success || json.enrolled) {
        setEnrolled(true);
        // Auto-expand first lesson
        const sorted = [...course.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
        if (sorted[0]) setExpandedLesson(sorted[0].id);
      }
    } catch { /* ignore */ }
    setEnrolling(false);
  };

  const handleCompleteLesson = async (lessonId: number) => {
    if (!course || completedLessons.has(lessonId)) return;
    setCompleting(lessonId);
    try {
      const res = await fetch('/api/lms/complete-lesson', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, courseId: course.id }),
      });
      const json = await res.json();
      if (json.success || json.courseCompleted !== undefined) {
        setCompletedLessons(prev => new Set([...prev, lessonId]));
        if (json.courseCompleted || json.data?.courseCompleted) {
          setCourseCompleted(true);
        }
        // Build reward toast data
        const xp = json.xpEarned || json.data?.xpEarned || 25;
        const carbon = json.carbonPointsEarned || json.data?.carbonPointsEarned || 0;
        setRewards({
          xpAwarded: xp,
          newAchievements: [],
          completedChallenges: carbon > 0 ? [`Earned ${carbon} Carbon Points!`] : [],
          currentStreak: 0,
        });

        // Advance to next lesson
        const sorted = [...course.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
        const idx = sorted.findIndex(l => l.id === lessonId);
        if (idx < sorted.length - 1) {
          setTimeout(() => setExpandedLesson(sorted[idx + 1].id), 600);
        }
      }
    } catch { /* ignore */ }
    setCompleting(null);
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-[var(--bg)]">
        <div className="h-32 bg-[var(--surface)] animate-pulse" />
        <div className="p-4 space-y-3">
          <div className="h-6 w-2/3 bg-[var(--surface)] rounded animate-pulse" />
          <div className="h-4 w-full bg-[var(--surface)] rounded animate-pulse" />
          <div className="h-20 bg-[var(--surface)] rounded-xl animate-pulse" />
          <div className="h-20 bg-[var(--surface)] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-dvh bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center space-y-3">
          <IconLock size={40} color="var(--muted)" />
          <p className="text-[var(--muted)]">Course not found</p>
          <Link href="/" className="text-[var(--accent)] text-sm">&larr; Back to map</Link>
        </div>
      </div>
    );
  }

  const sorted = [...course.lessons].sort((a, b) => a.orderIndex - b.orderIndex);
  const diff = DIFFICULTY_STYLE[course.difficulty] || DIFFICULTY_STYLE.beginner;
  const gradient = COURSE_GRADIENTS[course.slug] || 'linear-gradient(135deg, #1a1d27 0%, #242836 100%)';
  const completedCount = sorted.filter(l => completedLessons.has(l.id)).length;
  const progressPct = sorted.length > 0 ? (completedCount / sorted.length) * 100 : 0;

  return (
    <div className="min-h-dvh bg-[var(--bg)]">
      {/* Hero */}
      <div className="relative" style={{ background: gradient }}>
        <div className="px-4 pt-4 pb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-white/70 text-sm mb-4 hover:text-white transition-colors"
          >
            &larr; Back
          </Link>
          <h1 className="text-xl font-bold text-white leading-tight">{course.title}</h1>
          <p className="text-white/60 text-sm mt-2 leading-relaxed">{course.description}</p>
          <div className="flex items-center gap-3 mt-4 text-xs text-white/50">
            <span
              className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wide text-[10px]"
              style={{ background: diff.bg, color: diff.text }}
            >
              {diff.label}
            </span>
            <span>{sorted.length} lessons</span>
            <span>&middot;</span>
            <span>{course.estimatedMinutes} min</span>
            <span>&middot;</span>
            <span className="flex items-center gap-0.5 text-[var(--warn)]">
              <IconStar size={10} color="var(--warn)" />
              {course.pointsReward} pts
            </span>
          </div>
        </div>

        {/* Progress bar overlay at bottom of hero */}
        {enrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-[var(--accent)] transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      {/* Enrolled status bar */}
      {enrolled && (
        <div className="px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {courseCompleted ? (
              <>
                <div className="w-6 h-6 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <IconCheck size={14} color="#000" />
                </div>
                <span className="text-sm font-medium text-[var(--accent)]">Course Complete!</span>
              </>
            ) : (
              <>
                <IconGraduate size={18} color="var(--accent)" />
                <span className="text-sm text-[var(--muted)]">
                  {completedCount} of {sorted.length} lessons
                </span>
              </>
            )}
          </div>
          {courseCompleted && (
            <span className="text-xs text-[var(--warn)] font-bold flex items-center gap-1">
              <IconStar size={12} color="var(--warn)" />
              +{course.pointsReward} Carbon Points
            </span>
          )}
        </div>
      )}

      {/* Auth gate / Enroll / Lessons */}
      <div className="p-4 space-y-3 pb-12">
        {sessionStatus === 'unauthenticated' && (
          <AuthPrompt variant="gate" />
        )}

        {session && !enrolled && (
          <button
            onClick={handleEnroll}
            disabled={enrolling}
            className="w-full py-3.5 bg-[var(--accent)] text-black rounded-xl font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {enrolling ? 'Enrolling...' : 'Start This Course'}
          </button>
        )}

        {/* Lesson list */}
        {sorted.map((lesson, idx) => {
          const isExpanded = expandedLesson === lesson.id;
          const isCompleted = completedLessons.has(lesson.id);
          const isLocked = !enrolled;
          const isNext = enrolled && !isCompleted && idx === completedCount;

          return (
            <div
              key={lesson.id}
              className={`rounded-2xl border overflow-hidden transition-all ${
                isExpanded
                  ? 'border-[var(--accent)]/30 bg-[var(--surface)]'
                  : isCompleted
                    ? 'border-[var(--accent)]/20 bg-[var(--surface)]'
                    : 'border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              {/* Lesson header */}
              <button
                onClick={() => {
                  if (isLocked) return;
                  setExpandedLesson(isExpanded ? null : lesson.id);
                }}
                className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${
                  isLocked ? 'opacity-50 cursor-default' : ''
                }`}
              >
                {/* Step indicator */}
                <div
                  className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? 'bg-[var(--accent)] text-black'
                      : isNext
                        ? 'bg-[var(--accent)]/20 text-[var(--accent)] ring-2 ring-[var(--accent)]/30'
                        : 'bg-[var(--bg)] text-[var(--muted)]'
                  }`}
                >
                  {isCompleted ? (
                    <IconCheck size={16} color="#000" />
                  ) : isLocked ? (
                    <IconLock size={14} />
                  ) : (
                    idx + 1
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-snug ${
                    isCompleted ? 'text-[var(--accent)]' : ''
                  }`}>
                    {lesson.title}
                  </p>
                  <p className="text-[10px] text-[var(--muted)] mt-0.5">
                    {lesson.xpReward} XP
                  </p>
                </div>

                {!isLocked && (
                  <div className={`shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    <IconChevron size={18} color="var(--muted)" />
                  </div>
                )}
              </button>

              {/* Expanded lesson content */}
              {isExpanded && !isLocked && (
                <div className="border-t border-[var(--border)]">
                  <div className="p-5">
                    <LessonContent markdown={lesson.content} />
                  </div>

                  {/* Complete lesson button */}
                  {!isCompleted && (
                    <div className="px-5 pb-5">
                      <button
                        onClick={() => handleCompleteLesson(lesson.id)}
                        disabled={completing === lesson.id}
                        className="w-full py-3 bg-[var(--accent)] text-black rounded-xl font-bold text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
                      >
                        {completing === lesson.id ? 'Completing...' : (
                          idx === sorted.length - 1
                            ? `Complete Lesson & Finish Course`
                            : `Complete Lesson — Next: ${sorted[idx + 1]?.title}`
                        )}
                      </button>
                    </div>
                  )}

                  {isCompleted && (
                    <div className="px-5 pb-4 flex items-center gap-2 text-[var(--accent)]">
                      <IconCheck size={16} />
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reward toast */}
      <RewardToast rewards={rewards} onDismiss={() => setRewards(null)} />
    </div>
  );
}

// ─── Simple markdown renderer ──────────────────────────────────────
// Handles the subset used in lesson content: h1-h3, bold, italic, lists, blockquotes, paragraphs

function LessonContent({ markdown }: { markdown: string }) {
  const html = markdownToHtml(markdown);
  return (
    <div
      className="lesson-prose"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n');
  const out: string[] = [];
  let inList: 'ul' | 'ol' | null = null;
  let inBlockquote = false;

  const inline = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code style="background:var(--bg);padding:0.1em 0.3em;border-radius:4px;font-size:0.85em">$1</code>');
  };

  const closeList = () => {
    if (inList) {
      out.push(inList === 'ul' ? '</ul>' : '</ol>');
      inList = null;
    }
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      out.push('</blockquote>');
      inBlockquote = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Blank line
    if (line.trim() === '') {
      closeList();
      closeBlockquote();
      continue;
    }

    // Headers
    const h3 = line.match(/^### (.+)/);
    if (h3) { closeList(); closeBlockquote(); out.push(`<h3>${inline(h3[1])}</h3>`); continue; }

    const h2 = line.match(/^## (.+)/);
    if (h2) { closeList(); closeBlockquote(); out.push(`<h2>${inline(h2[1])}</h2>`); continue; }

    const h1 = line.match(/^# (.+)/);
    if (h1) { closeList(); closeBlockquote(); out.push(`<h1>${inline(h1[1])}</h1>`); continue; }

    // Blockquote
    const bq = line.match(/^> (.+)/);
    if (bq) {
      closeList();
      if (!inBlockquote) {
        out.push('<blockquote>');
        inBlockquote = true;
      }
      out.push(`<p>${inline(bq[1])}</p>`);
      continue;
    }
    if (inBlockquote) closeBlockquote();

    // Unordered list
    const ul = line.match(/^- (.+)/);
    if (ul) {
      if (inList !== 'ul') {
        closeList();
        out.push('<ul>');
        inList = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }

    // Ordered list
    const ol = line.match(/^\d+\. (.+)/);
    if (ol) {
      if (inList !== 'ol') {
        closeList();
        out.push('<ol>');
        inList = 'ol';
      }
      out.push(`<li>${inline(ol[1])}</li>`);
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/)) {
      closeList();
      out.push('<hr>');
      continue;
    }

    // Paragraph
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }

  closeList();
  closeBlockquote();

  return out.join('\n');
}
