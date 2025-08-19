import { create } from 'zustand';

export type Note = {
  id: string;
  title: string;
  content: string;
};

type NoteStore = {
  notes: Note[];
  selectedNoteId: string | null;
  addNote: (note: Note) => void;
  updateNote: (id: string, note: Note) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
};

export const useNotesStore = create<NoteStore>((set) => ({
  notes: [
    { id: '1', title: 'Welcome', content: 'This is your first note.' },
    { id: '2', title: 'Second Note', content: 'Add more notes from the sidebar.' },
  ],
  selectedNoteId: '1',
  addNote: (note) => set((state) => ({ notes: [...state.notes, note], selectedNoteId: note.id })),
  updateNote: (id, note) => set((state) => ({ notes: state.notes.map((n) => (n.id === id ? note : n)) })),
  deleteNote: (id) =>
    set((state) => ({
      notes: state.notes.filter((n) => n.id !== id),
      selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
    })),
  selectNote: (id) => set(() => ({ selectedNoteId: id })),
}));
