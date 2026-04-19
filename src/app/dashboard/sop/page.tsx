import { ColumnHeader } from "@/components/editorial/column-header";
import { SOPContent } from "./sop-content";

export const metadata = {
  title: "SOP Guide — Optic Rank",
};

export default function SOPPage() {
  return (
    <div className="space-y-8">
      <ColumnHeader
        title="Standard Operating Procedure"
        subtitle="Your complete guide to using every feature in Optic Rank. Read each section to understand what each tab does, what to expect, and how to get the best results."
      />
      <SOPContent />
    </div>
  );
}
