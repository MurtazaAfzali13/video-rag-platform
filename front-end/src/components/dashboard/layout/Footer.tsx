export function Footer() {
  return (
    <footer className="flex flex-col items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-6 text-xs text-white/30 sm:flex-row md:px-8">
      <p>© {new Date().getFullYear()} VidBrain. All rights reserved.</p>
      <p>Agentic Multi-Video Corrective RAG Platform · v2.4.1</p>
    </footer>
  );
}
