import BasicEditor from '@/components/editor/BasicEditor';

export default function Home() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BasicEditor className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-hidden" />
    </div>
  );
}
