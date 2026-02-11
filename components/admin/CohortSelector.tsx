import React from 'react';
import { Cohort } from '../../types';
import { Users } from 'lucide-react';

interface CohortSelectorProps {
    cohorts: Cohort[];
    selectedId: string | null;
    onChange: (id: string | null) => void;
}

const CohortSelector: React.FC<CohortSelectorProps> = ({ cohorts, selectedId, onChange }) => {
    if (cohorts.length === 0) return null;

    return (
        <div className="flex items-center gap-2">
            <Users size={16} className="text-rose-500 dark:text-rose-400 shrink-0" />
            <select
                value={selectedId || ''}
                onChange={(e) => onChange(e.target.value || null)}
                title="Фильтрует: студенты, стадии, созвоны, инвайты"
                className="px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-sm font-bold text-rose-700 dark:text-rose-300 focus:outline-none focus:border-rose-500 transition-colors appearance-none cursor-pointer pr-8"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b5cf6' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
            >
                {cohorts.map(c => (
                    <option key={c.id} value={c.id}>
                        {c.name} {c.studentCount !== undefined ? `(${c.studentCount})` : ''}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default CohortSelector;
