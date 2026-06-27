"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Exam, QuizMode } from "@/types";
import { BookOpen, Clock, Play, Trash2, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  exam: Exam;
  index: number;
  onDeleted: () => void;
}

export default function ExamCard({ exam, index, onDeleted }: Props) {
  const router = useRouter();
  const [showModes, setShowModes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const modes: { id: QuizMode; label: string; questions: number; minutes: number }[] = [
    { id: "30q30m", label: "Quick Test", questions: 30, minutes: 30 },
    { id: "50q50m", label: "Full Test", questions: 50, minutes: 50 },
  ];

  function startQuiz(mode: QuizMode) {
    router.push(`/exam/${exam.id}?mode=${mode}`);
  }

  async function deleteExam() {
    if (!confirm("Delete this exam and all its questions?")) return;

    setDeleting(true);

    const q = await supabase
      .from("questions")
      .delete()
      .eq("exam_id", exam.id);

    console.log("Questions delete:", q);

    const e = await supabase
      .from("exams")
      .delete()
      .eq("id", exam.id);

    console.log("Exam delete:", e);

    if (q.error || e.error) {
      alert(q.error?.message || e.error?.message);
      setDeleting(false);
      return;
    }

    onDeleted();
  }
  
  const canTake30 = exam.question_count >= 30;
  const canTake50 = exam.question_count >= 50;

  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 flex flex-col gap-4 animate-slide-up hover:border-brand-500/40 transition-all"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-md bg-brand-500/15 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-3.5 h-3.5 text-brand-400" />
            </div>
            <h3 className="font-semibold text-white text-sm truncate">{exam.name}</h3>
          </div>
          <p className="text-xs text-[var(--text-muted)] pl-9">
            {exam.question_count} questions · {new Date(exam.created_at).toLocaleDateString()}
          </p>
        </div>
        <button
          onClick={deleteExam}
          disabled={deleting}
          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-400/10 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Mode selector */}
      <div className="space-y-2">
        {modes.map((mode) => {
          const canTake = mode.questions === 30 ? canTake30 : canTake50;
          return (
            <button
              key={mode.id}
              onClick={() => canTake && startQuiz(mode.id)}
              disabled={!canTake}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                canTake
                  ? "border-[var(--border)] hover:border-brand-500 hover:bg-brand-500/10 text-[var(--text)] cursor-pointer"
                  : "border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Play className="w-3.5 h-3.5" />
                <span>{mode.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {mode.questions}q
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {mode.minutes}m
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {!canTake30 && (
        <p className="text-xs text-[var(--text-muted)] text-center">
          Need at least 30 questions to start a quiz
        </p>
      )}
    </div>
  );
}
