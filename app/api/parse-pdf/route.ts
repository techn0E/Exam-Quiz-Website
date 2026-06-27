import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import pdf from "pdf-parse";

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

    const buffer = Buffer.from(await file.arrayBuffer());

    const data = await pdf(buffer);

    const text = data.text;

    console.log(text.substring(0,3000));

    const cleanedText = text
      .replace(/<PARSED TEXT FOR PAGE:.*?>/g, "")
      .replace(/\r/g, "")
      .trim();
    
    const questionBlocks =
      cleanedText.match(/\d+\.[\s\S]*?(?=\d+\.|$)/g) ?? [];

    console.log("Blocks:", questionBlocks.length);
    
    const questions: {
      question_text: string;
      options: string[];
      correct_answer: string;
    }[] = [];

    for (const block of questionBlocks) {
      const lines = block
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length === 0) continue;

      // -------------------------
      // QUESTION
      // -------------------------

      let question = "";
      let index = 0;

      while (
        index < lines.length &&
        !lines[index].startsWith("•") &&
        !lines[index].startsWith("√")
      ) {
        question +=
          lines[index]
            .replace(/^\d+\.\s*/, "")
            .trim() + " ";

        index++;
      }

      question = question.trim();

      if (!question) continue;

      // -------------------------
      // OPTIONS
      // -------------------------

      const options: string[] = [];
      let correct = "";

      let currentOption = -1;

      for (; index < lines.length; index++) {
        const line = lines[index];
 
        if (line === "√") {
            index++;

            if (index < lines.length) {
                const option = lines[index].trim();

                options.push(option);

                correct = option;

                currentOption = options.length - 1;
            }

            continue;
        }

        if (line === "•") {
            index++;

            if (index < lines.length) {
                const option = lines[index].trim();

                options.push(option);

                currentOption = options.length - 1;
            }

            continue;
        }
      
        if (line.startsWith("√")) {
          const option = line.replace(/^√\s*/, "").trim();

          options.push(option);

          currentOption = options.length - 1;

          correct = option;

          continue;
        }

        if (line.startsWith("•")) {
          const option = line.replace(/^•\s*/, "").trim();

          options.push(option);

          currentOption = options.length - 1;

          continue;
        }

        // Multiline option
        if (currentOption >= 0) {
          options[currentOption] += " " + line;

          if (correct === options[currentOption].replace(" " + line, "")) {
            correct = options[currentOption];
          }
        } else {
          // Multiline question
          question += " " + line;
        }
      }

      if (options.length < 2) continue;

      questions.push({
        question_text: question.trim(),
        options,
        correct_answer: correct.trim(),
      });
    }

    console.log("Questions extracted:", questions.length);


    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error("No questions extracted");
    }

    // Save to Supabase
    const supabase = createServerClient();

    // Create exam record
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .insert({
        name: examName,
        source_file: file.name,
        question_count: questions.length,
      })
      .select()
      .single();

    if (examError) throw new Error(`DB error: ${examError.message}`);

    // Insert all questions in batches of 100
    const batchSize = 100;
    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize).map((q) => ({
        exam_id: exam.id,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
      }));

      const { error: qError } = await supabase.from("questions").insert(batch);
      if (qError) throw new Error(`Failed to save questions: ${qError.message}`);
    }

    return NextResponse.json({
      success: true,
      examId: exam.id,
      questionCount: questions.length,
    });
  } catch (err: any) {
    console.error("PDF parse error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
