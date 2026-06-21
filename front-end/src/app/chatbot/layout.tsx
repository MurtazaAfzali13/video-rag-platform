import { TooltipProvider } from "@/components/ui/tooltip";

export default function ChatbotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-x-0 top-20 bottom-0 z-50 overflow-hidden bg-[#0B0F19]">
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </div>
  );
}