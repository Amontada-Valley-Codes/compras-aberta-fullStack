import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-800/50 rounded-md ${className}`}
      aria-hidden="true"
    />
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-scroll">
      <table className="admin-table">
        <thead>
          <tr>
            <th><Skeleton className="h-4 w-24" /></th>
            <th><Skeleton className="h-4 w-32" /></th>
            <th><Skeleton className="h-4 w-20" /></th>
            <th><Skeleton className="h-4 w-16" /></th>
            <th><Skeleton className="h-4 w-24" /></th>
            <th><Skeleton className="h-4 w-12" /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td>
                <div className="company-cell" style={{ gap: "1rem", alignItems: "center" }}>
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </td>
              <td>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </td>
              <td><Skeleton className="h-4 w-24" /></td>
              <td><Skeleton className="h-4 w-16" /></td>
              <td><Skeleton className="h-6 w-24 rounded-full" /></td>
              <td><Skeleton className="h-8 w-28 rounded-md" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
