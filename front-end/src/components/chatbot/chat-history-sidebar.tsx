"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Clock, Star, Archive, Settings, LogOut } from "lucide-react";
import { CHAT_HISTORY } from "@/lib/mock-data";

export function ChatHistorySidebar() {
  return (
    <aside className="flex w-[20%] min-w-[260px] flex-col bg-gradient-to-b from-[#08101F] via-[#050816] to-[#050816] border-r border-slate-700/30 backdrop-blur-sm relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 via-transparent to-transparent pointer-events-none" />
      
      {/* New Chat Button */}
      <div className="border-b border-slate-700/30 p-5 relative">
        <Button className="w-full gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white shadow-lg shadow-purple-500/20 transition-all duration-300 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-98 rounded-xl py-5">
          <Plus className="size-4" />
          <span className="font-medium">New Chat</span>
        </Button>
      </div>

      {/* Chat History */}
      <ScrollArea className="flex-1 px-3 py-4 custom-scrollbar-sidebar">
        <div className="space-y-6">
          {CHAT_HISTORY.map((section) => (
            <div key={section.group}>
              <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                {section.group}
              </p>
              <ul className="space-y-1">
                {section.chats.map((chat) => {
                  const Icon = chat.icon;
                  return (
                    <li key={chat.id}>
                      <button
                        type="button"
                        className="group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-300 transition-all duration-200 hover:bg-[#101A2E] hover:text-slate-100 hover:border hover:border-purple-500/20"
                      >
                        <Icon className="size-4 shrink-0 text-purple-400 transition-colors group-hover:text-purple-300" />
                        <span className="truncate flex-1 text-[13px] font-medium">{chat.title}</span>
                        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Bottom Section */}
      <div className="border-t border-slate-700/30 p-5 space-y-4 relative">
        {/* Usage Stats */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 font-medium">Free Plan Usage</span>
            <span className="text-purple-400 font-semibold">68%</span>
          </div>
          <div className="relative h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden">
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300"
              style={{ width: "68%" }}
            />
          </div>
        </div>

        {/* Upgrade Button */}
        <Button 
          variant="outline" 
          className="w-full text-xs font-medium border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 hover:border-purple-500/50 transition-all duration-200 rounded-lg py-2"
        >
          Upgrade to Pro
        </Button>

        {/* Footer Actions */}
        <div className="pt-2 space-y-1">
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-all duration-200 hover:bg-[#101A2E] hover:text-slate-200">
            <Settings className="size-4" />
            <span>Settings</span>
          </button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 transition-all duration-200 hover:bg-[#101A2E] hover:text-red-400">
            <LogOut className="size-4" />
            <span>Log out</span>
          </button>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar-sidebar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-track {
          background: #0C1426;
          border-radius: 10px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb {
          background: #7C3AED;
          border-radius: 10px;
        }
        .custom-scrollbar-sidebar::-webkit-scrollbar-thumb:hover {
          background: #8B5CF6;
        }
      `}</style>
    </aside>
  );
}