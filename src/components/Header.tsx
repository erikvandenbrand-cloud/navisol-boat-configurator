'use client';

import { Settings, Menu, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onMenuClick?: () => void;
}

// Navisol helm wheel SVG logo component
function NavisolLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 50 40" className={className} fill="currentColor">
      {/* Helm wheel */}
      <circle cx="32" cy="18" r="12" fill="none" stroke="currentColor" strokeWidth="2.5"/>
      <circle cx="32" cy="18" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
      {/* Spokes */}
      <line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" strokeWidth="2"/>
      <line x1="32" y1="22" x2="32" y2="30" stroke="currentColor" strokeWidth="2"/>
      <line x1="20" y1="18" x2="28" y2="18" stroke="currentColor" strokeWidth="2"/>
      <line x1="36" y1="18" x2="44" y2="18" stroke="currentColor" strokeWidth="2"/>
      <line x1="23.5" y1="9.5" x2="28.5" y2="14.5" stroke="currentColor" strokeWidth="2"/>
      <line x1="35.5" y1="21.5" x2="40.5" y2="26.5" stroke="currentColor" strokeWidth="2"/>
      <line x1="23.5" y1="26.5" x2="28.5" y2="21.5" stroke="currentColor" strokeWidth="2"/>
      <line x1="35.5" y1="14.5" x2="40.5" y2="9.5" stroke="currentColor" strokeWidth="2"/>
      {/* Waves */}
      <path d="M5 32 Q12 26 19 32 T33 32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 38 Q17 32 24 38 T38 38" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function Header({ onMenuClick }: HeaderProps) {
  const { currentUser, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-[#2d3748] text-white">
      <div className="flex h-16 items-center px-4 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 text-[#5B8FA8]">
            <NavisolLogo className="h-10 w-10" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-wide text-[#5B8FA8]">NAVISOL</span>
            <span className="text-xs text-slate-400">Boat Manufacturing System</span>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 text-sm text-slate-400">
            <span>Industriestraat 25, 8081HH Elburg</span>
            <span className="mx-2">|</span>
            <span>+31 (0)85 0600 139</span>
          </div>

          {/* User Menu */}
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-slate-700"
                >
                  <div className="h-8 w-8 rounded-full bg-emerald-600/30 flex items-center justify-center">
                    <span className="text-emerald-300 font-medium text-sm">
                      {currentUser.firstName[0]}{currentUser.lastName[0]}
                    </span>
                  </div>
                  <span className="hidden lg:block text-sm">
                    {currentUser.firstName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{currentUser.firstName} {currentUser.lastName}</span>
                    <span className="text-xs font-normal text-slate-500">{currentUser.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={logout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-300 hover:text-white hover:bg-slate-700"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
