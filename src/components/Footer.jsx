export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#1f1f1f] py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#f5f5f5]">Batch Apps</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6]" />
        </div>
        <p className="text-xs text-[#888888]">
          © {year} Batch Apps. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
