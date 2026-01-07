'use client';

import React, { useState } from 'react';
import { Anchor, Zap, Lock, User, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useStoreV2 } from '@/lib/store-v2';

export function LoginV2() {
  const { login, settings } = useStoreV2();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    const success = login(username, password);
    if (!success) {
      setError('Invalid username or password');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <Anchor className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{settings.company.name}</h1>
              <p className="text-sm text-slate-400">{settings.company.tagline}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-400">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Electric First</span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight">
              Dutch-Built<br />
              Aluminium Boats
            </h2>
            <p className="text-slate-400 max-w-md">
              Engineering excellence meets sustainable propulsion.
              Welcome to the future of boating.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">10+</p>
              <p className="text-sm text-slate-400">Boat Models</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">100%</p>
              <p className="text-sm text-slate-400">Electric Options</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">CE</p>
              <p className="text-sm text-slate-400">Compliant</p>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <p className="text-2xl font-bold text-white">NL</p>
              <p className="text-sm text-slate-400">Made in Holland</p>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-500">
          <p>{settings.company.address}, {settings.company.city}</p>
          <p>{settings.company.country}</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto">
              <Anchor className="w-9 h-9 text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-4">{settings.company.name}</h1>
            <p className="text-sm text-slate-500">{settings.company.tagline}</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>
                Sign in to your account to continue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-slate-500 text-center mb-3">Demo Credentials</p>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => { setUsername('admin'); setPassword('admin123'); }}
                    className="p-2 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <p className="font-medium text-slate-700">Admin</p>
                    <p className="text-slate-500">Full access</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('manager'); setPassword('manager123'); }}
                    className="p-2 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <p className="font-medium text-slate-700">Manager</p>
                    <p className="text-slate-500">Management</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUsername('sales'); setPassword('sales123'); }}
                    className="p-2 rounded bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <p className="font-medium text-slate-700">Sales</p>
                    <p className="text-slate-500">Commercial</p>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-slate-500 mt-6">
            Manufacturing System v2.0
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginV2;
