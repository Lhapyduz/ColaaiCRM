'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
    FiSearch,
    FiChevronUp,
    FiChevronDown,
    FiChevronLeft,
    FiChevronRight,
    FiMoreVertical,
    FiCheck
} from 'react-icons/fi';

export interface Column<T> {
    key: keyof T | string;
    header: string;
    sortable?: boolean;
    width?: string;
    render?: (value: unknown, row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyField: keyof T;
    searchable?: boolean;
    searchPlaceholder?: string;
    selectable?: boolean;
    onRowClick?: (row: T) => void;
    onSelectionChange?: (selected: T[]) => void;
    actions?: (row: T) => React.ReactNode;
    pageSize?: number;
    loading?: boolean;
    emptyMessage?: string;
}

export default function DataTable<T extends object>({
    columns,
    data,
    keyField,
    searchable = true,
    searchPlaceholder = 'Buscar...',
    selectable = false,
    onRowClick,
    onSelectionChange,
    actions,
    pageSize = 10,
    loading = false,
    emptyMessage = 'Nenhum dado encontrado',
}: DataTableProps<T>) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState<keyof T | string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [selected, setSelected] = useState<Set<unknown>>(new Set());
    const [currentPage, setCurrentPage] = useState(1);

    // Filter data by search
    const filteredData = useMemo(() => {
        if (!search.trim()) return data;
        const lowerSearch = search.toLowerCase();
        return data.filter((row) =>
            Object.values(row).some(
                (val) => String(val).toLowerCase().includes(lowerSearch)
            )
        );
    }, [data, search]);

    // Sort data
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;
        return [...filteredData].sort((a, b) => {
            const aVal = a[sortKey as keyof T];
            const bVal = b[sortKey as keyof T];
            if (aVal === bVal) return 0;
            if (aVal === null || aVal === undefined) return 1;
            if (bVal === null || bVal === undefined) return -1;
            const comparison = aVal < bVal ? -1 : 1;
            return sortDir === 'asc' ? comparison : -comparison;
        });
    }, [filteredData, sortKey, sortDir]);

    // Paginate data
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedData.slice(start, start + pageSize);
    }, [sortedData, currentPage, pageSize]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (key: keyof T | string) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const toggleSelectAll = () => {
        if (selected.size === paginatedData.length) {
            setSelected(new Set());
            onSelectionChange?.([]);
        } else {
            const newSelected = new Set(paginatedData.map((row) => row[keyField]));
            setSelected(newSelected);
            onSelectionChange?.(paginatedData);
        }
    };

    const toggleSelect = (row: T) => {
        const key = row[keyField];
        const newSelected = new Set(selected);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelected(newSelected);
        onSelectionChange?.(data.filter((r) => newSelected.has(r[keyField])));
    };

    const getValue = (row: T, key: keyof T | string): unknown => {
        if (typeof key === 'string' && key.includes('.')) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return key.split('.').reduce((obj: any, k: string) => obj?.[k], row as any);
        }
        return row[key as keyof T];
    };

    if (loading) {
        return (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-gray-700">
                    <div className="h-10 bg-gray-700 rounded-lg animate-pulse w-72" />
                </div>
                <div className="divide-y divide-gray-700">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-4 flex gap-4">
                            {Array.from({ length: columns.length }).map((_, j) => (
                                <div key={j} className="h-5 bg-gray-700 rounded animate-pulse flex-1" />
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            {/* Search Bar */}
            {searchable && (
                <div className="p-4 border-b border-gray-700">
                    <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder={searchPlaceholder}
                            className="w-full max-w-sm pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                        />
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-900/50">
                            {selectable && (
                                <th className="w-12 px-4 py-3">
                                    <button
                                        onClick={toggleSelectAll}
                                        className={cn(
                                            "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                            selected.size === paginatedData.length && paginatedData.length > 0
                                                ? "bg-orange-500 border-orange-500"
                                                : "border-gray-600 hover:border-gray-500"
                                        )}
                                    >
                                        {selected.size === paginatedData.length && paginatedData.length > 0 && (
                                            <FiCheck className="text-white" size={14} />
                                        )}
                                    </button>
                                </th>
                            )}
                            {columns.map((col) => (
                                <th
                                    key={String(col.key)}
                                    className={cn(
                                        "px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider",
                                        col.sortable && "cursor-pointer hover:text-white select-none"
                                    )}
                                    style={{ width: col.width }}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.header}
                                        {col.sortable && sortKey === col.key && (
                                            sortDir === 'asc' ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />
                                        )}
                                    </div>
                                </th>
                            ))}
                            {actions && <th className="w-12 px-4 py-3" />}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}
                                    className="px-4 py-12 text-center text-gray-500"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row) => {
                                const rowKey = row[keyField] as string;
                                const isSelected = selected.has(rowKey);
                                return (
                                    <tr
                                        key={rowKey}
                                        onClick={() => onRowClick?.(row)}
                                        className={cn(
                                            "transition-colors",
                                            onRowClick && "cursor-pointer",
                                            isSelected ? "bg-orange-500/10" : "hover:bg-gray-700/30"
                                        )}
                                    >
                                        {selectable && (
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleSelect(row);
                                                    }}
                                                    className={cn(
                                                        "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                                                        isSelected
                                                            ? "bg-orange-500 border-orange-500"
                                                            : "border-gray-600 hover:border-gray-500"
                                                    )}
                                                >
                                                    {isSelected && <FiCheck className="text-white" size={14} />}
                                                </button>
                                            </td>
                                        )}
                                        {columns.map((col) => {
                                            const value = getValue(row, col.key);
                                            return (
                                                <td key={String(col.key)} className="px-4 py-3 text-sm text-gray-300">
                                                    {col.render ? col.render(value, row) : String(value ?? '-')}
                                                </td>
                                            );
                                        })}
                                        {actions && (
                                            <td className="px-4 py-3">
                                                <div className="flex justify-end">
                                                    {actions(row)}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-gray-700 flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                        Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FiChevronLeft size={18} />
                        </button>
                        <span className="px-4 py-2 text-sm text-gray-400">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="p-2 rounded-lg bg-gray-700 text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <FiChevronRight size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
