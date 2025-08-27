import { create } from 'zustand';

export type Note = {
  id: string;
  title: string;
  content: string;
  updatedAt: Date;
  createdAt: Date;
};

export type NoteUpdate = Partial<Omit<Note, 'id' | 'createdAt' | 'updatedAt'>>;

type NoteStore = {
  notes: Note[];
  selectedNoteId: string | null;
  addNote: (note: Note) => void;
  updateNote: (id: string, updates: NoteUpdate) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
};

const sortNotesByUpdatedAtDesc = (notes: Note[]) =>
  [...notes].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

export const useNotesStore = create<NoteStore>((set) => ({
  notes: [
    {
      id: '1',
      title: 'Welcome',
      content: 'This is your first note.',
      updatedAt: new Date(),
      createdAt: new Date(),
    },
  ],
  selectedNoteId: '1',
  addNote: (note) =>
    set((state) => ({
      notes: sortNotesByUpdatedAtDesc([note, ...state.notes]),
      selectedNoteId: note.id,
    })),
  updateNote: (id, updates) =>
    set((state) => {
      const updatedNotes = state.notes.map((note) =>
        note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note,
      );
      return { notes: sortNotesByUpdatedAtDesc(updatedNotes) };
    }),
  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
    })),
  selectNote: (id) => set(() => ({ selectedNoteId: id })),
}));
