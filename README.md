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

---

## 📦 Tech Stack

- **Frontend**: Next.js (App Router), TipTap editor, Tailwind + ShadCN UI
- **Backend**: Prisma + Postgres (sync + storage)
- **Offline**: IndexedDB (Dexie) for local persistence

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
