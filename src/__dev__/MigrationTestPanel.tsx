/**
 * Migration Test Panel - DEV ONLY
 *
 * React component to run migration tests in the browser.
 * Only renders in development mode.
 *
 * Usage: Add <MigrationTestPanel /> to any page during development
 *
 * @dev-only
 */

'use client';

import { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle, Loader2 } from 'lucide-react';

// Guard: Only render in development
const isDev = process.env.NODE_ENV === 'development';

interface TestResult {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failures: string[];
  migratedWorkItems: any[];
}

export function MigrationTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Don't render in production
  if (!isDev) {
    return null;
  }

  async function handleRunTest() {
    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      // Dynamic import to ensure code splitting
      const { runMigrationTest } = await import('./migration-test');
      const testResult = await runMigrationTest();
      setResult(testResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-slate-900 text-white rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span className="font-semibold text-sm">DEV: Migration Test</span>
        </div>
        <button
          onClick={handleRunTest}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-600 rounded text-xs font-medium transition-colors"
        >
          {isRunning ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-3 w-3" />
              Run Test
            </>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-80 overflow-y-auto">
        {!result && !error && !isRunning && (
          <p className="text-sm text-slate-400">
            Click "Run Test" to verify migrateToWorkItems() function.
            This creates a legacy project, migrates it, and validates the output.
          </p>
        )}

        {isRunning && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 font-medium text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Error
            </div>
            <p className="text-xs text-red-300">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-3">
            {/* Summary */}
            <div
              className={`p-3 rounded-lg border ${
                result.passed
                  ? 'bg-green-900/50 border-green-700'
                  : 'bg-red-900/50 border-red-700'
              }`}
            >
              <div className="flex items-center gap-2 font-medium text-sm mb-1">
                {result.passed ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-green-400">All Tests Passed</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-400" />
                    <span className="text-red-400">Tests Failed</span>
                  </>
                )}
              </div>
              <p className="text-xs text-slate-300">
                {result.passedChecks}/{result.totalChecks} checks passed
              </p>
            </div>

            {/* Failures */}
            {result.failures.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-red-400">Failures:</p>
                <ul className="text-xs text-red-300 space-y-1">
                  {result.failures.map((f, i) => (
                    <li key={i} className="pl-3 border-l-2 border-red-600">
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* WorkItems Summary */}
            <div className="space-y-1">
              <p className="text-xs font-medium text-slate-400">
                Migrated WorkItems ({result.migratedWorkItems.length}):
              </p>
              <div className="space-y-1">
                {result.migratedWorkItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between px-2 py-1.5 bg-slate-800 rounded text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          item.kind === 'planning'
                            ? 'bg-blue-900 text-blue-300'
                            : 'bg-purple-900 text-purple-300'
                        }`}
                      >
                        {item.kind}
                      </span>
                      <span className="text-slate-300 truncate max-w-[120px]">
                        {item.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] ${
                        item.status === 'COMPLETED'
                          ? 'text-green-400'
                          : item.status === 'IN_PROGRESS'
                            ? 'text-blue-400'
                            : 'text-slate-400'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-slate-800 border-t border-slate-700">
        <p className="text-[10px] text-slate-500">
          This panel only appears in development mode
        </p>
      </div>
    </div>
  );
}

export default MigrationTestPanel;
