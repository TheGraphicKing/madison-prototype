"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
  useTable,
  type SortingState,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Mark } from "./mark";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Col<T> = {
  id: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** value used for sorting; columns without it are not sortable */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right";
  width?: string;
  className?: string;
  /** hide below 768 px */
  hideOnMobile?: boolean;
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, basic: sortFn_basic },
});

/**
 * Hairline rows, no zebra, rows 44 high, right-aligned tabular numbers, mono ids.
 * Hover shows a 2 px ink rule on the left. Sortable headers with drawn chevrons,
 * sticky header, arrow-key row navigation, Enter to open.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  getRowId,
  onRowClick,
  renderExpanded,
  expandedId,
  ariaLabel,
  className,
  stickyTop = 0,
  rowClassName,
  empty,
  initialSort,
}: {
  data: T[];
  columns: Col<T>[];
  getRowId: (row: T) => string;
  onRowClick?: (row: T) => void;
  renderExpanded?: (row: T) => React.ReactNode;
  expandedId?: string | null;
  ariaLabel: string;
  className?: string;
  stickyTop?: number;
  rowClassName?: (row: T) => string | undefined;
  empty?: React.ReactNode;
  initialSort?: SortingState;
}) {
  const helper = useMemo(() => createColumnHelper<typeof features, T>(), []);
  const tcols = useMemo(
    () =>
      helper.columns(
        columns.map((c) =>
          helper.accessor((row: T) => (c.sortValue ? c.sortValue(row) : ""), {
            id: c.id,
            header: () => c.header,
            enableSorting: Boolean(c.sortValue),
            sortFn: "alphanumeric",
          }),
        ),
      ),
    [columns, helper],
  );
  const [sorting, setSorting] = useState<SortingState>(initialSort ?? []);
  const table = useTable({
    features,
    columns: tcols,
    data,
    getRowId: (row: T) => getRowId(row),
    state: { sorting },
    onSortingChange: setSorting,
  });
  const rows = table.getRowModel().rows;
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);
  const colById = new Map(columns.map((c) => [c.id, c]));

  const onKey = (e: React.KeyboardEvent, i: number, row: T) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      rowRefs.current[Math.min(rows.length - 1, i + 1)]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      rowRefs.current[Math.max(0, i - 1)]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      if (onRowClick) {
        e.preventDefault();
        onRowClick(row);
      }
    }
  };

  return (
    <div className={cn("w-full", className)}>
      <table className="w-full border-collapse text-left" aria-label={ariaLabel}>
        <thead className="sticky z-[2] bg-ground" style={{ top: stickyTop }}>
          {table.getHeaderGroups().map((g) => (
            <tr key={g.id}>
              {g.headers.map((h) => {
                const c = colById.get(h.column.id)!;
                const sorted = h.column.getIsSorted();
                const canSort = h.column.getCanSort();
                return (
                  <th
                    key={h.id}
                    scope="col"
                    aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                    className={cn(
                      "h-10 border-b border-line px-3 align-middle font-normal first:pl-4 last:pr-4",
                      c.align === "right" && "text-right",
                      c.hideOnMobile && "max-md:hidden",
                    )}
                    style={{ width: c.width }}
                  >
                    {canSort ? (
                      <button
                        onClick={h.column.getToggleSortingHandler() as React.MouseEventHandler}
                        className={cn("t-label inline-flex items-center gap-1.5 hover:text-ink", sorted && "text-ink")}
                      >
                        {c.header}
                        <span className="inline-flex w-3 flex-col items-center">
                          {sorted === "desc" ? (
                            <Mark kind="chevron-down" size={11} />
                          ) : sorted === "asc" ? (
                            <Mark kind="chevron-up" size={11} />
                          ) : (
                            <Mark kind="chevron-down" size={11} className="opacity-35" />
                          )}
                        </span>
                      </button>
                    ) : (
                      <span className="t-label">{c.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-ink3">
                {empty ?? "Nothing here."}
              </td>
            </tr>
          ) : null}
          {rows.map((r, i) => {
            const row = r.original as T;
            const id = getRowId(row);
            const open = expandedId === id;
            return (
              <Fragment key={r.id}>
                <tr
                  ref={(el) => {
                    rowRefs.current[i] = el;
                  }}
                  tabIndex={0}
                  aria-expanded={renderExpanded ? open : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={(e) => onKey(e, i, row)}
                  className={cn(
                    "group relative h-11 border-b border-line outline-none transition-colors duration-[120ms]",
                    onRowClick && "cursor-pointer",
                    "hover:bg-surface focus-visible:bg-surface",
                    open && "bg-surface",
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((c, ci) => (
                    <td
                      key={c.id}
                      className={cn(
                        "relative px-3 py-2.5 align-middle first:pl-4 last:pr-4",
                        c.align === "right" && "text-right tabular",
                        c.hideOnMobile && "max-md:hidden",
                        c.className,
                      )}
                    >
                      {ci === 0 ? (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-0 bottom-0 left-0 w-[2px] bg-ink opacity-0 transition-opacity duration-[120ms] group-hover:opacity-100 group-focus-visible:opacity-100",
                            open && "opacity-100",
                          )}
                        />
                      ) : null}
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
                {renderExpanded && open ? (
                  <tr className="border-b border-line bg-surface">
                    <td colSpan={columns.length} className="p-0">
                      {renderExpanded(row)}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
