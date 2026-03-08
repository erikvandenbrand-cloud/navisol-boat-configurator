'use client';

/**
 * UserSelect - Assignee selection components
 *
 * GOVERNANCE: Staff concept removed in v323 — use User instead.
 *
 * Two variants:
 * 1. UserSelect (legacy) - returns user name as string
 * 2. UserSelectStable (v324+) - returns user ID for stable identity
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check, ChevronsUpDown, User, UserPlus, Mail } from 'lucide-react';
import type { User as UserModel } from '@/domain/models';
import { AuthService } from '@/domain/services/AuthService';
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
import type { AssigneeValue } from '@/domain/utils/assignee-utils';

// ============================================
// STABLE USER SELECT (v324+)
// ============================================

interface UserSelectStableProps {
  /** Current selected user IDs */
  value: string[];
  /** Called when selection changes */
  onChange: (userIds: string[], users: AssigneeValue[]) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Allow free text entry (default: false for stable select) */
  allowFreeText?: boolean;
  /** Whether to allow multiple selection */
  multiple?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size variant */
  size?: 'default' | 'sm';
  /** Optional className */
  className?: string;
}

/**
 * UserSelectStable - Stable ID-based user selection (v324+)
 *
 * GOVERNANCE: Use this for all new assignee selection.
 * Returns User IDs which are stable across name changes.
 * Shows "DisplayName — email" format for clarity.
 */
export function UserSelectStable({
  value,
  onChange,
  placeholder = 'Select assignee...',
  allowFreeText = false,
  multiple = false,
  disabled = false,
  size = 'default',
  className,
}: UserSelectStableProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const allUsers = await AuthService.getAllUsers();
      const activeUsers = allUsers.filter((u) => u.isActive);
      activeUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(activeUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Build user map for quick lookup
  const usersMap = useMemo(() => {
    const map = new Map<string, UserModel>();
    for (const user of users) {
      map.set(user.id, user);
    }
    return map;
  }, [users]);

  // Get selected users
  const selectedUsers = useMemo(() => {
    return value
      .map((id) => usersMap.get(id))
      .filter((u): u is UserModel => u !== undefined);
  }, [value, usersMap]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchValue) return users;
    const lowerSearch = searchValue.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(lowerSearch) ||
        u.email.toLowerCase().includes(lowerSearch) ||
        u.department?.toLowerCase().includes(lowerSearch)
    );
  }, [users, searchValue]);

  const handleSelect = useCallback((user: UserModel) => {
    let newValue: string[];
    if (multiple) {
      // Toggle selection
      if (value.includes(user.id)) {
        newValue = value.filter((id) => id !== user.id);
      } else {
        newValue = [...value, user.id];
      }
    } else {
      // Single selection
      newValue = [user.id];
      setOpen(false);
    }
    setSearchValue('');

    // Map to AssigneeValue for the callback
    const assigneeValues: AssigneeValue[] = newValue
      .map((id) => usersMap.get(id))
      .filter((u): u is UserModel => u !== undefined)
      .map((u) => ({
        userId: u.id,
        displayName: u.name,
        email: u.email,
      }));

    onChange(newValue, assigneeValues);
  }, [value, multiple, usersMap, onChange]);

  const handleClear = useCallback(() => {
    onChange([], []);
    setOpen(false);
  }, [onChange]);

  // Display text for trigger
  const displayText = useMemo(() => {
    if (selectedUsers.length === 0) return null;
    if (selectedUsers.length === 1) {
      return selectedUsers[0].name;
    }
    return `${selectedUsers.length} assignees`;
  }, [selectedUsers]);

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
            !displayText && 'text-muted-foreground',
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            {displayText ? (
              <>
                <User className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">{displayText}</span>
                {selectedUsers.length === 1 && selectedUsers[0].department && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {selectedUsers[0].department}
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
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Loading users...
              </div>
            ) : (
              <>
                {filteredUsers.length === 0 && (
                  <CommandEmpty>
                    {users.length === 0
                      ? 'No users defined'
                      : 'No matching users found'}
                  </CommandEmpty>
                )}

                {/* User list with "DisplayName — email" format */}
                {filteredUsers.length > 0 && (
                  <CommandGroup heading="Users">
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.id}
                        onSelect={() => handleSelect(user)}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            value.includes(user.id)
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{user.name}</span>
                            {user.department && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                              >
                                {user.department}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Clear option */}
                {value.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleClear}
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

// ============================================
// LEGACY USER SELECT (backward compatibility)
// ============================================

interface UserSelectProps {
  /** Current value (user name or free text) */
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
 * UserSelect - Legacy name-based user selection
 *
 * @deprecated Use UserSelectStable for new code (v324+).
 * This component returns user names which are fragile if users rename.
 */
export function UserSelect({
  value,
  onChange,
  placeholder = 'Select or type name...',
  allowFreeText = true,
  disabled = false,
  size = 'default',
  className,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchValue, setSearchValue] = useState('');

  // Load users on mount
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const allUsers = await AuthService.getAllUsers();
      // Only show active users
      const activeUsers = allUsers.filter((u) => u.isActive);
      // Sort by name
      activeUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(activeUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Find matching user for current value
  const selectedUser = useMemo(() => {
    if (!value) return null;
    const lowerValue = value.toLowerCase();
    return users.find((u) => u.name.toLowerCase() === lowerValue) || null;
  }, [value, users]);

  // Filter users based on search
  const filteredUsers = useMemo(() => {
    if (!searchValue) return users;
    const lowerSearch = searchValue.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(lowerSearch) ||
        u.email.toLowerCase().includes(lowerSearch) ||
        u.department?.toLowerCase().includes(lowerSearch)
    );
  }, [users, searchValue]);

  // Check if search value is a new name (not in user list)
  const isNewName = useMemo(() => {
    if (!searchValue.trim()) return false;
    const lowerSearch = searchValue.toLowerCase();
    return !users.some((u) => u.name.toLowerCase() === lowerSearch);
  }, [searchValue, users]);

  function handleSelect(userName: string) {
    onChange(userName);
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
                {selectedUser?.department && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                    {selectedUser.department}
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
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name or email..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                Loading users...
              </div>
            ) : (
              <>
                {filteredUsers.length === 0 && !isNewName && (
                  <CommandEmpty>
                    {users.length === 0
                      ? 'No users defined'
                      : 'No matching users found'}
                  </CommandEmpty>
                )}

                {/* User list with "DisplayName — email" format */}
                {filteredUsers.length > 0 && (
                  <CommandGroup heading="Users">
                    {filteredUsers.map((user) => (
                      <CommandItem
                        key={user.id}
                        value={user.name}
                        onSelect={() => handleSelect(user.name)}
                        className="flex items-center gap-2"
                      >
                        <Check
                          className={cn(
                            'h-4 w-4 flex-shrink-0',
                            value?.toLowerCase() === user.name.toLowerCase()
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{user.name}</span>
                            {user.department && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1 py-0 h-4 flex-shrink-0"
                              >
                                {user.department}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{user.email}</span>
                          </div>
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
 * Hook to load active users for use in components
 *
 * GOVERNANCE: Staff concept removed in v323 — use User instead.
 * This hook was previously useStaffList().
 */
export function useUserList() {
  const [users, setUsers] = useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const allUsers = await AuthService.getAllUsers();
      const activeUsers = allUsers.filter((u) => u.isActive);
      activeUsers.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(activeUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Build maps for efficient lookups
  const usersMap = useMemo(() => {
    const map = new Map<string, UserModel>();
    for (const user of users) {
      map.set(user.id, user);
    }
    return map;
  }, [users]);

  const usersByNameMap = useMemo(() => {
    const map = new Map<string, UserModel>();
    for (const user of users) {
      map.set(user.name.toLowerCase(), user);
    }
    return map;
  }, [users]);

  return { users, usersMap, usersByNameMap, isLoading, refresh: loadUsers };
}

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================

/**
 * @deprecated Use UserSelect instead. Staff concept removed in v323.
 */
export const StaffSelect = UserSelect;

/**
 * @deprecated Use useUserList instead. Staff concept removed in v323.
 */
export const useStaffList = useUserList;
