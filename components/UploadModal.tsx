"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Props {
  onClose: () => void;
  onComplete: () => void;
}

type Status = "idle" | "uploading" | "parsing" | "saving" | "done" | "error";

export default function UploadModal({ onClose, onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [examName, setExamName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [questionCount, setQuestionCount] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    const name = f.name.toLowerCase();

    if (!name.endsWith(".pdf") && !name.endsWith(".csv")) {
      alert("Only PDF or CSV files are supported.");
      return;
    }

    setFile(f);

    if (!examName) {
      setExamName(
        f.name.replace(".pdf", "").replace(".csv", "")
      );
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  async function handleSubmit() {
    if (!file || !examName.trim()) return;

    setStatus("uploading");
    setStatusMsg("Reading file...");

    try {
      // Get current session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please login as admin.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("examName", examName.trim());

      const endpoint = file.name.toLowerCase().endsWith(".csv")
        ? "/api/import-csv"
        : "/api/parse-pdf";

      setStatus("parsing");
      setStatusMsg("Parsing questions...");

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Upload failed");
      }

      setQuestionCount(json.questionCount);

      setStatus("done");
      setStatusMsg(`Imported ${json.questionCount} questions.`);

      setTimeout(() => {
        onComplete();
      }, 1200);

    } catch (err: any) {
      setStatus("error");
      setStatusMsg(err.message);
    }
  }

  const statusConfig = {
    idle: null,
    uploading: { icon: Loader2, color: "text-brand-400", spin: true },
    parsing: { icon: Loader2, color: "text-brand-400", spin: true },
    saving: { icon: Loader2, color: "text-brand-400", spin: true },
    done: { icon: CheckCircle, color: "text-emerald-400", spin: false },
    error: { icon: AlertCircle, color: "text-red-400", spin: false },
  };

  const sc = statusConfig[status];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl animate-slide-up">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="font-bold text-white">Upload Exam PDF</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] text-[var(--text-muted)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* File drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragging
                ? "border-brand-500 bg-brand-500/10"
                : file
                ? "border-emerald-500/50 bg-emerald-500/5"
                : "border-[var(--border)] hover:border-brand-500/50 hover:bg-brand-500/5"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <>
                <FileText className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-white">{file.name}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {(file.size / 1024 / 1024).toFixed(1)} MB
                </p>
              </>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-sm font-medium text-white">Drop your PDF here</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">or click to browse</p>
              </>
            )}
          </div>

          {/* Exam name */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              Exam Name
            </label>
            <input
              type="text"
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              placeholder="e.g. Electronics & IoT Security"
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] text-white placeholder-[var(--text-muted)] text-sm focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Status */}
          {status !== "idle" && sc && (
            <div className={`flex items-center gap-2 text-sm ${sc.color} bg-[var(--surface-2)] rounded-lg px-3 py-2.5`}>
              <sc.icon className={`w-4 h-4 flex-shrink-0 ${sc.spin ? "animate-spin" : ""}`} />
              <span>{statusMsg}</span>
              {status === "done" && (
                <span className="ml-auto text-xs text-[var(--text-muted)]">{questionCount} questions</span>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!file || !examName.trim() || ["uploading", "parsing", "saving", "done"].includes(status)}
            className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-lg transition-colors"
          >
            {status === "idle" || status === "error" ? "Extract Questions" : "Processing..."}
          </button>

          <p className="text-xs text-[var(--text-muted)] text-center">
            Parser will parse every question and answer from your PDF
          </p>
        </div>
      </div>
    </div>
  );
}
