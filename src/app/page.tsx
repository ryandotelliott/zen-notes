import BasicEditor from '@/components/editor/BasicEditor';

export default function Home() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col p-4">
      <div className="mx-auto w-full max-w-3xl rounded-md border bg-card p-4">
        <BasicEditor />
      </div>
    </div>
  );
}
