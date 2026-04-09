export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ringo-teal border-t-transparent" />
        <p className="text-sm text-ringo-muted">Loading...</p>
      </div>
    </div>
  );
}
