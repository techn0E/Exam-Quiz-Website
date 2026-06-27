# QuizForge — IoT Exam Prep

Upload any exam PDF → Parser extracts all questions → take timed practice exams.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a free project
2. Go to the **SQL Editor** and run the contents of `supabase-schema.sql`
3. Copy your project URL and keys from **Settings → API**

### 3. Set up environment variables
Add `.env.local` with your actual keys:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> Get your Anthropic API key at [console.anthropic.com](https://console.anthropic.com)

### 4. Run the app
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## How it works

1. **Upload PDF** — Click "Upload PDF", drop your exam file
2. **Parser** — PDF Parser reads the PDF and extracts every Q&A (looks for √ marks as correct answers)
3. **Take Exam** — Choose 30q/30min or 50q/50min mode
4. **Review** — See your score and review every answer

## PDF Format

The app is designed for PDFs where the correct answer is marked with `√`. 
Example:
```
1. What is X?
√ The correct answer
• Wrong option A
• Wrong option B
```

It will also work with other formats — Claude is smart enough to figure it out.
