import { Check, X } from "lucide-react";

interface ComparisonRow {
  feature: string;
  values: (boolean | string)[];
}

interface ComparisonTableProps {
  columns: string[];
  rows: ComparisonRow[];
  highlightColumn?: number;
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === "boolean") {
    return value ? (
      <Check size={18} strokeWidth={2} className="mx-auto text-editorial-green" />
    ) : (
      <X size={18} strokeWidth={2} className="mx-auto text-ink-muted" />
    );
  }
  return <span className="text-sm text-ink-secondary">{value}</span>;
}

export function ComparisonTable({
  columns,
  rows,
  highlightColumn = 0,
}: ComparisonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b-2 border-rule-dark">
            <th className="py-4 pl-4 pr-6 text-left text-xs font-bold uppercase tracking-widest text-ink-muted">
              Feature
            </th>
            {columns.map((col, i) => (
              <th
                key={col}
                className={`px-6 py-4 text-center text-xs font-bold uppercase tracking-widest ${
                  i === highlightColumn
                    ? "bg-editorial-red/5 text-editorial-red"
                    : "text-ink-muted"
                }`}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature} className="border-b border-rule">
              <td className="py-3.5 pl-4 pr-6 text-sm font-medium text-ink">
                {row.feature}
              </td>
              {row.values.map((value, i) => (
                <td
                  key={`${row.feature}-${i}`}
                  className={`px-6 py-3.5 text-center ${
                    i === highlightColumn ? "bg-editorial-red/5" : ""
                  }`}
                >
                  <ComparisonCell value={value} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
