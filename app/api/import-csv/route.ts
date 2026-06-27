import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  result.push(current.trim());

  return result;
};


export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const examName = formData.get("examName") as string;

    if (!file || !examName) {
      return NextResponse.json({ error: "File and exam name required" }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split("\n").filter(Boolean);

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes("question_text") || firstLine.includes("question");
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const questions: Array<{ question_text: string; options: string[]; correct_answer: string }> = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;
      const cols = parseCSVLine(line);
      const question_text = cols[0]?.replace(/^"|"$/g, "").trim();
      const correct_answer = cols[6]?.replace(/^"|"$/g, "").trim();
      const options = cols.slice(1, 6).map((o) => o.replace(/^"|"$/g, "").trim()).filter(Boolean);
      if (!question_text || !correct_answer || options.length < 2) continue;
      questions.push({ question_text, options, correct_answer });
    }

    if (questions.length === 0) {
      return NextResponse.json({ error: "No valid questions found in CSV" }, { status: 400 });
    }

    const supabase = createServerClient();
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert({ name: examName, source_file: file.name, question_count: questions.length })
      .select().single();

    if (examError) throw new Error(examError.message);

    for (let i = 0; i < questions.length; i += 100) {
      const batch = questions.slice(i, i + 100).map((q) => ({ exam_id: exam.id, ...q }));
      const { error } = await supabase.from("questions").insert(batch);
      if (error) throw new Error(error.message);
    }

    return NextResponse.json({ success: true, examId: exam.id, questionCount: questions.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
