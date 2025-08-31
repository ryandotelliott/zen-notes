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

  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;

  getCurrentEditorTitle: (() => string) | undefined;
  setEditorTitleGetter: (fn: (() => string) | undefined) => void;

  getCurrentEditorContent: (() => string) | undefined;
  setEditorContentGetter: (fn: (() => string) | undefined) => void;

  addNote: () => void;
  updateNote: (id: string, updates: NoteUpdate) => void;
  deleteNote: (id: string) => void;
  selectNote: (id: string | null) => void;
};

const sortByUpdatedAt = (notes: Note[], dir: 'asc' | 'desc' = 'desc') =>
  [...notes].sort((a, b) =>
    dir === 'desc' ? b.updatedAt.getTime() - a.updatedAt.getTime() : a.updatedAt.getTime() - b.updatedAt.getTime(),
  );

export const useNotesStore = create<NoteStore>((set) => {
  const persistPendingEdits = (state: NoteStore): Pick<NoteStore, 'notes' | 'hasUnsavedChanges'> => {
    const content = state.getCurrentEditorContent?.();
    const title = state.getCurrentEditorTitle?.();

    // Return the current state if there's no updates, so that we can still spread the state
    if (!state.hasUnsavedChanges || !state.selectedNoteId)
      return {
        notes: state.notes,
        hasUnsavedChanges: state.hasUnsavedChanges,
      };

    const updates: Partial<Note> = { updatedAt: new Date() };
    if (content != null) updates.content = content;
    if (title != null) updates.title = title;

    const updatedNotes = state.notes.map((n) => (n.id === state.selectedNoteId ? { ...n, ...updates } : n));

    return { notes: sortByUpdatedAt(updatedNotes), hasUnsavedChanges: false };
  };

  return {
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

    hasUnsavedChanges: false,
    setHasUnsavedChanges: (value) => set({ hasUnsavedChanges: value }),

    getCurrentEditorTitle: undefined,
    setEditorTitleGetter: (fn) => set({ getCurrentEditorTitle: fn }),

    getCurrentEditorContent: undefined,
    setEditorContentGetter: (fn) => set({ getCurrentEditorContent: fn }),

    addNote: () =>
      set((state) => {
        const note = {
          id: crypto.randomUUID(),
          title: '',
          content: '<p></p>',
          updatedAt: new Date(),
          createdAt: new Date(),
        };

        const persisted = persistPendingEdits(state);
        const nextNotes = sortByUpdatedAt([note, ...persisted.notes]);

        return {
          ...persisted,
          notes: nextNotes,
          selectedNoteId: note.id,
        };
      }),
    updateNote: (id, updates) =>
      set((state) => {
        const updatedNotes = state.notes.map((note) =>
          note.id === id ? { ...note, ...updates, updatedAt: new Date() } : note,
        );
        return { notes: sortByUpdatedAt(updatedNotes) };
      }),
    deleteNote: (id) =>
      set((state) => {
        const deletingSelected = state.selectedNoteId === id;

        const next: Partial<NoteStore> = {
          notes: state.notes.filter((n) => n.id !== id),
        };

        if (deletingSelected) {
          next.selectedNoteId = null;
          next.hasUnsavedChanges = false;
        }

        return next;
      }),
    selectNote: (id) =>
      set((state) => {
        if (state.selectedNoteId === id) return {};

        const persisted = persistPendingEdits(state);
        return {
          selectedNoteId: id,
          ...persisted,
        };
      }),
  };
});
