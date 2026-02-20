# Pair Studio (OpenAI Contest)

Realtime pair-programming workspace built with Next.js, Liveblocks, Monaco, Canvas whiteboard, and Groq AI.

## What I built

This project is a serverless collaborative coding workspace where multiple users can:

- create/join private rooms (optional room password)
- edit code together in realtime (Monaco + Liveblocks/Yjs sync)
- draw on a shared whiteboard (custom Canvas implementation)
- run code from the editor across many languages (`/api/run`)
- chat with an AI assistant (Groq Llama 4 Scout, streaming)
- use team collaboration tools inside the room:
  - realtime room chat
  - shared task board
  - shared session notes
  - shared run history
  - session summary export

## How Codex was used

Codex was used as the primary implementation partner to:

- scaffold and iterate the Next.js App Router architecture
- integrate Liveblocks auth, room access, and realtime sync
- port and wire Monaco editor behavior into React components
- implement the custom whiteboard and realtime storage sync
- build API routes for Groq chat streaming and code execution
- add room UX features (join flow, password protection, participants, notifications)
- perform iterative UI refactors based on direct feedback
- debug runtime/type issues and validate changes with TypeScript checks

All final architecture, product direction, and feature priorities were guided through iterative prompting and review.

## How to run

### 1) Install dependencies

```bash
pnpm install
```

### 2) Configure environment

Create `.env.local` from `.env.example` and set values:

- `LIVEBLOCKS_SECRET_KEY`
- `LIVEBLOCKS_PUBLIC_KEY` (if used by your setup)
- `GROQ_API_KEY`

Important: never commit real keys.

### 3) Start development server

```bash
pnpm dev
```

Then open:

- `http://localhost:3000`

## Demo / screenshots

Current screenshots from this repo:

![Landing / Hero](screenshots/Screenshot%202026-02-20%20155617.png)
![Room Join / Access](screenshots/Screenshot%202026-02-20%20155627.png)
![Workspace View 1](screenshots/Screenshot%202026-02-20%20155634.png)
![Workspace View 2](screenshots/Screenshot%202026-02-20%20155732.png)
![Control Center / Tools](screenshots/Screenshot%202026-02-20%20155850.png)
![AI + Collaboration](screenshots/Screenshot%202026-02-20%20161205.png)

## Security note

This repository does not include `.env` / `.env.local` in version control. Keep all production keys in local or deployment secrets.
