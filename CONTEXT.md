# TranslateIO — AI Context Document

> This document is for AI assistants (Gemini, Claude, ChatGPT, etc.) working on this codebase.
> It explains what the app does, how it's built, and where to find things.

---

## What Is This App?

TranslateIO is a **Japanese-to-English translation practice app** built with Next.js. Users import Japanese video content (from YouTube or local files), the app splits it into segments by subtitle timing, and users practice translating each segment by speaking aloud. Their speech is transcribed, then scored by Gemini AI on the translation's own merits — not against a fixed reference.

**Core loop:** Watch JP segment → Speak your EN translation → Get scored → See feedback + sample reference → Retry or move on.

---

## Tech Stack

| What | Technology |
|------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| Database | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM |
| LLM Scoring | Gemini Flash API (`@google/generative-ai`) |
| Speech-to-Text | Browser Web Speech API (Chrome/Edge) |
| YouTube Subs | `yt-dlp` (system binary) + `ffmpeg` |
| Video Player | `react-player` (dynamically imported) |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── layout.tsx                # Root layout with navigation bar
│   ├── page.tsx                  # Dashboard — lists all imported videos with scores
│   ├── import/page.tsx           # Import screen — YouTube URL or local file upload
│   ├── video/[id]/
│   │   ├── page.tsx              # Segment editor — merge, split, edit, delete segments
│   │   ├── practice/page.tsx     # Core practice interface (THE main feature)
│   │   └── review/page.tsx       # Review scores per segment, filter by status
│   ├── vocabulary/page.tsx       # Saved vocabulary words with search/filter/export
│   └── api/
│       ├── youtube/route.ts      # POST: extract subtitles via yt-dlp
│       ├── score/route.ts        # POST: score translation via Gemini
│       ├── videos/route.ts       # GET/DELETE: video CRUD
│       ├── segments/route.ts     # GET/PUT/DELETE/POST(merge): segment CRUD
│       └── vocabulary/route.ts   # GET/POST/PUT/DELETE: vocabulary CRUD
├── components/
│   ├── VideoPlayer.tsx           # Memoized react-player wrapper (YouTube + local)
│   ├── SpeechRecorder.tsx        # Hold-to-record mic button, Web Speech API
│   └── ScoreDisplay.tsx          # Score card with color-coding and dimensions
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Drizzle ORM table definitions (5 tables)
│   │   ├── index.ts              # DB connection singleton
│   │   └── migrations/           # Auto-generated SQL migrations
│   ├── subtitles/
│   │   ├── srt.ts                # SRT subtitle parser
│   │   └── ass.ts                # ASS/SSA subtitle parser
│   ├── youtube.ts                # yt-dlp wrapper — extracts JP/EN subs from YouTube
│   ├── scoring.ts                # Gemini API integration — merit-based scoring
│   └── speech.ts                 # Web Speech API wrapper with browser compat
├── types/
│   └── index.ts                  # All TypeScript interfaces and type aliases
data/
├── translateio.db                # SQLite database (auto-created)
.env.local                        # GEMINI_API_KEY goes here
```

---

## Database Schema (5 tables)

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `videos` | Imported video metadata | id, title, source_type (youtube/local), source_url, direction (jp_to_en/en_to_jp) |
| `segments` | Individual subtitle segments to practice | id, video_id (FK), position, start_time, end_time, japanese_text, english_ref |
| `attempts` | Every translation attempt by the user | id, segment_id (FK), user_translation, score (1-10), feedback_json, feedback_mode |
| `sessions` | Practice session tracking | id, video_id (FK), started_at, completed_at, segments_done, avg_score |
| `vocabulary` | Saved vocabulary words | id, word, reading, meaning, segment_id (FK), context_sentence, familiarity (new/learning/known) |

Schema defined in: `src/lib/db/schema.ts`

---

## How Scoring Works

Scoring is **merit-based** — the user's translation is evaluated on its own quality, NOT compared against a fixed reference. This avoids penalizing valid alternative translations.

**Gemini evaluates on 4 dimensions:**
1. Meaning Accuracy — does it capture the core meaning?
2. Completeness — any significant omissions?
3. Naturalness — does the English sound natural?
4. Nuance — register, emotion, emphasis preserved?

**Two modes:**
- **Quick** — score (1-10) + one-line feedback + sample reference (~50-80 tokens)
- **Detailed** — score + per-dimension breakdown + specific notes + reference (~200-350 tokens)

A sample reference translation is always shown AFTER scoring for learning purposes.

Scoring logic: `src/lib/scoring.ts`
API route: `src/app/api/score/route.ts`

---

## Key Design Decisions

1. **Merit-based scoring (not reference-based)** — Translation has many valid outputs. Scoring against a reference penalizes correct alternatives. Gemini evaluates quality directly from the Japanese source.

2. **Gemini Flash free tier** — 1,500 req/day at zero cost. Architecture has a provider interface so Claude or other LLMs can be swapped in later.

3. **Browser Web Speech API for STT** — Free, no API key, works in Chrome/Edge. Google Cloud STT can be added later for better accuracy.

4. **SQLite (not Postgres)** — Zero infrastructure, file-based, perfect for a local-first app. Drizzle ORM makes migration to Postgres trivial if needed later.

5. **yt-dlp for YouTube** — More reliable than YouTube Data API for subtitle extraction, no quota limits, supports auto-generated subs.

6. **Separate JP/EN subtitle fetching** — YouTube often rate-limits (429 errors). Fetching each language independently prevents total failure when one language is blocked.

---

## Practice Page Architecture (the core feature)

File: `src/app/video/[id]/practice/page.tsx`

**Layout:** Left sidebar (segment navigator) + Main area (video + JP text + recording)

**Segment sidebar:**
- Shows all segments with status icons: `○` (unattempted), `✓` (passed, score 7+), `✗` (failed)
- Click any segment to jump to it
- "Fix Up Mode" button filters to only failed segments
- Progress bar: green (passed) + red (failed) + gray (unattempted)

**Flow per segment:**
1. Video plays the JP audio segment
2. Japanese text displayed below
3. User holds mic button → speech transcribed in real-time
4. User reviews transcript → Submit or Re-record
5. Gemini scores → show result with color-coded badge
6. Options: Retry | Show Answer | Next Segment

**VideoPlayer component** (`src/components/VideoPlayer.tsx`):
- Wrapped in `React.memo` to prevent re-renders from parent state changes
- Uses refs for callbacks to keep stable identity
- Seeks to segment start/end times instead of remounting
- `seekTrigger` prop for replay functionality

---

## What's Not Built Yet (Future Work)

### English → Japanese Mode (UI placeholder exists, grayed out in nav)
- User hears English → speaks Japanese translation → scored on JP output
- Needs: Japanese STT (Google Cloud supports `ja-JP`), JP scoring prompt
- Data model ready: `direction` field on videos table

### Clickable Japanese Words
- Components planned: `ClickableJapanese.tsx`, `WordPopup.tsx`
- Click a word during practice → dictionary popup → "Add to Vocab"
- Dictionary API: Jisho or bundled JMdict data
- Vocabulary table exists and API routes work, just needs the click-to-lookup UI

### Not yet implemented:
- `src/app/api/dictionary/route.ts` — word lookup endpoint
- `src/components/ClickableJapanese.tsx` — tokenized JP text with click handlers
- `src/components/WordPopup.tsx` — dictionary popup
- `src/lib/providers.ts` — pluggable LLM/STT provider interface
- Progress charts/graphs on dashboard
- Keyboard shortcuts (space = play, R = record, Enter = submit)
- Session tracking (sessions table exists but isn't populated yet)
- Local video file upload handler (POST to `/api/videos` with FormData)

---

## How to Run

```bash
# Install dependencies
npm install

# Ensure system dependencies
brew install yt-dlp ffmpeg

# Set Gemini API key in .env.local
# Get free key from: https://aistudio.google.com/apikey

# Start dev server
npm run dev
# Open http://localhost:3000 in Chrome (needed for speech recognition)
```

---

## How You Can Help

If you're an AI assistant working on this codebase, here are high-value tasks:

1. **Build the clickable Japanese words feature** — tokenize JP text (use a library like `kuromoji` or `budoux`), show dictionary popups, wire up "Add to Vocab" to the existing API
2. **Implement the local video file upload** — handle FormData in `POST /api/videos`, parse uploaded SRT/ASS files, save video to `/uploads/`
3. **Add keyboard shortcuts** to the practice page
4. **Build progress charts** on the dashboard (score trends over time)
5. **Implement session tracking** — start/complete sessions, track segments done
6. **Build the EN→JP mode** — reverse the flow, use Japanese STT, create JP scoring prompt
7. **Add error boundaries and loading states** throughout the app
8. **Fix any TypeScript strict mode issues** — some `any` types exist due to react-player/Web Speech API compat
