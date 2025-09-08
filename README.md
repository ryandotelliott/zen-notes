# Zen Notes

Zen Notes is my vision of the _perfect_ notes app — a balance between the simplicity of Apple Notes, the flexibility of Obsidian, and accessibility of Notion.
It provides rich text editing and AI capabilities, without the clutter and bloat of many other apps.

## ✨ Features

### 📝 Editing

- **Rich-text / Markdown hybrid** – clean writing experience with familiar shortcuts.
- **Offline-first** – write anywhere, sync when online.
- **Remote syncing** – seamless backup and access across devices.
- **Customizable themes** – personalize your workspace with minimal, focused designs.
- **Pinned notes** – keep important documents at the top for quick access.

### 🤖 AI

- **Voice Transcription** – high-quality speech-to-text transcriptions.
- **Semantic search** – find notes by meaning, not just keywords.
- **AI assistant** – rewrite or generate content directly in your notes.
- **AI Chat** – chat with AI that has access to your notes.

---

## 🛠️ Roadmap

- **Desktop app (Tauri)** – native cross-platform experience.
- **Mobile app (React Native)** – fast, offline-capable mobile client.
- **End-to-end encryption** – privacy and security built-in.

---

## 📦 Tech Stack

- **Frontend**: Next.js (App Router), TipTap editor, Tailwind + ShadCN UI
- **Backend**: Prisma + Postgres (sync + storage)
- **Offline**: IndexedDB (Dexie) for local persistence
- **AI**: OpenAI APIs (Whisper, GPT), embeddings for semantic search

---

## 🚀 Getting Started

### Prerequisites

- Node.js (>= 18)
- pnpm
- Postgres database

### Installation

```bash
git clone https://github.com/ryandotelliott/zen-notes.git
cd zen-notes
pnpm install
pnpm dev
```
