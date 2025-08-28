import EditorMain from '@/components/editor/editor-main';

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <EditorMain className="mx-auto min-h-0 w-full max-w-4xl flex-1 overflow-hidden" />
    </div>
  );
}
