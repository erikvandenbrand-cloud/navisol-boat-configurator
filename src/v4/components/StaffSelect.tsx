'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, User, UserPlus } from 'lucide-react';
import type { StaffMember } from '@/domain/models';
import { StaffRepository } from '@/data/repositories';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

interface StaffSelectProps {
  /** Current value (staff name or free text) */
  value: string;
  /** Called when value changes */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Allow free text entry (default: true) */
  allowFreeText?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'default' | 'sm';
  /** Optional className */
  className?: string;
}

/**
 * StaffSelect - A combobox for selecting staff members
 *
 * Features:
 * - Loads staff from global Staff list
 * - Allows free-text entry for backward compatibility
 * - Shows staff label if available
 * - Non-breaking: existing free-text assignees continue to work
 */
export function StaffSelect({
  value,
  onChange,
  placeholder = 'Select or type name...',
  allowFreeText = true,
  disabled = false,
  size = 'default',
  className,
}: StaffSelectProps) {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  // Load staff on mount
  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setIsLoading(true);
    try {
      const active = await StaffRepository.getActive();
      setStaff(active);
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Find matching staff member for current value
  const selectedStaff = useMemo(() => {
    if (!value) return null;
    const lowerValue = value.toLowerCase();
    return staff.find((s) => s.name.toLowerCase() === lowerValue) || null;
  }, [value, staff]);

  // Filter staff based on search
  const filteredStaff = useMemo(() => {
    if (!searchValue) return staff;
    const lowerSearch = searchValue.toLowerCase();
    return staff.filter(
      (s) =>
        s.name.toLowerCase().includes(lowerSearch) ||
        s.label?.toLowerCase().includes(lowerSearch)
    );
  }, [staff, searchValue]);

  // Check if search value is a new name (not in staff list)
  const isNewName = useMemo(() => {
    if (!searchValue.trim()) return false;
    const lowerSearch = searchValue.toLowerCase();
    return !staff.some((s) => s.name.toLowerCase() === lowerSearch);
  }, [searchValue, staff]);

  function handleSelect(staffName: string) {
    onChange(staffName);
    setOpen(false);
    setSearchValue('');
  }

  function handleUseFreeText() {
    if (searchValue.trim()) {
      onChange(searchValue.trim());
      setOpen(false);
      setSearchValue('');
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'justify-between font-normal',
            size === 'sm' ? 'h-8 text-sm' : 'h-9',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {value ? (
              <>
                <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">{value}</span>
                {selectedStaff?.label && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {selectedStaff.label}
                  </Badge>
                )}
              </>
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search staff..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Loading staff...
              </div>
            ) : (
              <>
                {filteredStaff.length === 0 && !isNewName && (
                  <CommandEmpty>
                    {staff.length === 0
                      ? 'No staff members defined'
                      : 'No matching staff found'}
                  </CommandEmpty>
                )}

                {/* Staff list */}
                {filteredStaff.length > 0 && (
                  <CommandGroup heading="Staff">
                    {filteredStaff.map((member) => (
                      <CommandItem
                        key={member.id}
                        value={member.name}
                        onSelect={() => handleSelect(member.name)}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4',
                            value?.toLowerCase() === member.name.toLowerCase()
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate">{member.name}</span>
                          {member.label && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                            >
                              {member.label}
                            </Badge>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Free text option */}
                {allowFreeText && isNewName && (
                  <>
                    <CommandSeparator />
                    <CommandGroup heading="Use as free text">
                      <CommandItem
                        onSelect={handleUseFreeText}
                        className="flex items-center gap-2"
                      >
                        <UserPlus className="h-4 w-4 text-slate-400" />
                        <span>Use "{searchValue}"</span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}

                {/* Clear option */}
                {value && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => handleSelect('')}
                        className="text-slate-500"
                      >
                        Clear selection
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Hook to load active staff for use in components
 */
export function useStaffList() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  async function loadStaff() {
    setIsLoading(true);
    try {
      const active = await StaffRepository.getActive();
      setStaff(active);
    } catch (error) {
      console.error('Failed to load staff:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return { staff, isLoading, refresh: loadStaff };
}
