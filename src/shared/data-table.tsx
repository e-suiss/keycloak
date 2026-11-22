// TanStack Table helpers on top of the esuiss Table primitives: sorting
// header, selection column, pagination and a row actions menu.

import {
  CaretDownIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpDownIcon,
  CaretUpIcon,
  DotsThreeIcon,
} from "@phosphor-icons/react"
import {
  type Column,
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
  useReactTable,
} from "@tanstack/react-table"
import { Button } from "@ui/components/button"
import { Checkbox } from "@ui/components/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu"
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table"
import { cn } from "@ui/lib/utils"
import * as React from "react"

type UseTableOptions<TData, TValue> = {
  data: TData[]
  columns: ColumnDef<TData, TValue>[]
  pageSize?: number
  enableRowSelection?: boolean
  initialSorting?: SortingState
}

function useTable<TData, TValue = unknown>({
  data,
  columns,
  pageSize = 10,
  enableRowSelection = false,
  initialSorting = [],
}: UseTableOptions<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>(initialSorting)
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [globalFilter, setGlobalFilter] = React.useState("")

  return useReactTable({
    data,
    columns,
    state: { sorting, rowSelection, globalFilter },
    enableRowSelection,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
  })
}

function TableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: {
  column: Column<TData, TValue>
  title: React.ReactNode
  className?: string
}) {
  if (!column.getCanSort()) {
    return <span className={className}>{title}</span>
  }
  const sorted = column.getIsSorted()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className={cn("-ms-3", className)}
    >
      {title}
      {sorted === "asc" ? (
        <CaretUpIcon weight="bold" />
      ) : sorted === "desc" ? (
        <CaretDownIcon weight="bold" />
      ) : (
        <CaretUpDownIcon className="opacity-50" />
      )}
    </Button>
  )
}

function selectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Tümünü seç"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        disabled={!row.getCanSelect()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Satırı seç"
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  }
}

function TablePagination<TData>({
  table,
  className,
}: {
  table: TanstackTable<TData>
  className?: string
}) {
  const { pageIndex } = table.getState().pagination
  const pageCount = Math.max(table.getPageCount(), 1)
  const selected = table.getFilteredSelectedRowModel().rows.length
  const total = table.getFilteredRowModel().rows.length

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-1 py-3 text-sm text-muted-foreground",
        className
      )}
    >
      <span>
        {selected > 0 ? `${selected} / ${total} seçili` : `${total} kayıt`}
      </span>
      <div className="flex items-center gap-3">
        <span className="tabular-nums">
          Sayfa {pageIndex + 1} / {pageCount}
        </span>
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Önceki sayfa"
          >
            <CaretLeftIcon weight="bold" className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Sonraki sayfa"
          >
            <CaretRightIcon weight="bold" className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function TableRowActions({
  children,
  label = "Aksiyonlar",
  align = "end",
}: {
  children: React.ReactNode
  label?: string
  align?: "start" | "center" | "end"
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          aria-label={label}
        >
          <DotsThreeIcon weight="bold" className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}

export type { Column, ColumnDef, Row, SortingState, TanstackTable }
export {
  flexRender,
  selectionColumn,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableColumnHeader,
  TableFooter,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
  TableRowActions,
  useTable,
}
