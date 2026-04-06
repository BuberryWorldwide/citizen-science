'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { IconGraduate, IconCheck, IconStar, IconLock } from '@/components/Icons';

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
  lessonCount: number;
}

interface Enrollment {
  courseId: number;
  completedAt: string | null;
}

interface LessonProgress {
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

const COURSE_EMOJI: Record<string, string> = {
  'tree-identification-fundamentals': '\u{1F333}',
  'photographing-plants-for-ai': '\u{1F4F7}',
  'phenology-observation': '\u{1F338}',
  'tree-health-assessment': '\u{1FA7A}',
  'fruit-quality-evaluation': '\u{1F34E}',
  'species-verification-and-community-science': '\u{1F50D}',
};

export function LearnPanel() {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/lms/courses')
      .then(r => r.json())
      .then(json => {
        if (json.success) setCourses(json.data || []);
        else if (Array.isArray(json)) setCourses(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (session) {
      fetch('/api/lms/user-progress')
        .then(r => r.json())
        .then(json => {
          if (json.success) {
            setEnrollments(json.data?.enrollments || []);
            setLessonProgress(json.data?.lessonProgress || []);
          }
        })
        .catch(() => {});
    }
  }, [session]);

  const getProgress = (courseId: number, lessonCount: number) => {
    const enrollment = enrollments.find(e => e.courseId === courseId);
    if (!enrollment) return null;
    if (enrollment.completedAt) return { completed: lessonCount, total: lessonCount, done: true };
    // Count lessons completed for this course — we don't have courseId on lessonProgress,
    // but we can count based on the total. This is approximate.
    return { completed: 0, total: lessonCount, done: false };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <IconGraduate size={24} color="var(--accent)" />
          <h2 className="text-lg font-bold">Learn</h2>
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-2xl bg-[var(--bg)] animate-pulse" />
        ))}
      </div>
    );
  }

  const enrolled = courses.filter(c => enrollments.some(e => e.courseId === c.id));
  const available = courses.filter(c => !enrollments.some(e => e.courseId === c.id));

  return (
    <div className="pb-8 space-y-5 overflow-y-auto max-h-[80dvh]">
      {/* Header */}
      <div className="px-5 pt-2 pb-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--accent)] flex items-center justify-center">
            <IconGraduate size={22} color="#000" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Field Training</h2>
            <p className="text-xs text-[var(--muted)]">
              {courses.length} courses &middot; Earn XP &amp; Carbon Points
            </p>
          </div>
        </div>
      </div>

      {/* Enrolled / In Progress */}
      {enrolled.length > 0 && (
        <div className="px-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            Continue Learning
          </h3>
          <div className="space-y-3">
            {enrolled.map(course => {
              const progress = getProgress(course.id, course.lessonCount);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  progress={progress}
                  enrolled
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available Courses */}
      {available.length > 0 && (
        <div className="px-4">
          <h3 className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-3">
            {enrolled.length > 0 ? 'More Courses' : 'Available Courses'}
          </h3>
          <div className="space-y-3">
            {available.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      )}

      {courses.length === 0 && (
        <div className="px-4 py-12 text-center">
          <IconLock size={40} color="var(--muted)" />
          <p className="text-[var(--muted)] text-sm mt-3">No courses available yet</p>
        </div>
      )}
    </div>
  );
}

function CourseCard({
  course,
  progress,
  enrolled,
}: {
  course: Course;
  progress?: { completed: number; total: number; done: boolean } | null;
  enrolled?: boolean;
}) {
  const diff = DIFFICULTY_STYLE[course.difficulty] || DIFFICULTY_STYLE.beginner;
  const gradient = COURSE_GRADIENTS[course.slug] || 'linear-gradient(135deg, #1a1d27 0%, #242836 100%)';
  const emoji = COURSE_EMOJI[course.slug] || '\u{1F4DA}';

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="block rounded-2xl overflow-hidden border border-[var(--border)] transition-transform active:scale-[0.98]"
    >
      {/* Gradient header with emoji */}
      <div
        className="relative px-4 pt-5 pb-4"
        style={{ background: gradient }}
      >
        <span className="text-3xl">{emoji}</span>
        {progress?.done && (
          <div className="absolute top-3 right-3 w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center">
            <IconCheck size={16} color="#000" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 bg-[var(--surface)] space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm leading-snug">{course.title}</h3>
          <span
            className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
            style={{ background: diff.bg, color: diff.text }}
          >
            {diff.label}
          </span>
        </div>

        <p className="text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
          {course.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-[var(--muted)]">
          <span>{course.lessonCount} lessons</span>
          <span>&middot;</span>
          <span>{course.estimatedMinutes} min</span>
          <span>&middot;</span>
          <span className="flex items-center gap-0.5">
            <IconStar size={10} color="var(--warn)" />
            <span className="text-[var(--warn)] font-bold">{course.pointsReward}</span> pts
          </span>
        </div>

        {/* Progress bar */}
        {enrolled && progress && !progress.done && (
          <div className="pt-1">
            <div className="h-1.5 bg-[var(--bg)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: `${Math.max((progress.completed / progress.total) * 100, 5)}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1">
              {progress.completed} of {progress.total} lessons
            </p>
          </div>
        )}

        {/* CTA hint */}
        {!enrolled && (
          <div className="pt-1">
            <span className="text-xs font-medium text-[var(--accent)]">
              Start course &rarr;
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
