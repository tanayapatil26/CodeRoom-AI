import { useToasts } from '../store/toast';

const tone = {
  info: 'border-line bg-white',
  success: 'border-emerald-300 bg-emerald-50',
  error: 'border-danger/40 bg-red-50 text-danger',
};

export default function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="pointer-events-none fixed bottom-16 right-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 md:bottom-4" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto rounded-md border px-3 py-2 text-sm shadow-sm ${tone[t.kind]}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
