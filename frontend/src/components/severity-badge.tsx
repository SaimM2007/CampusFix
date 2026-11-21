import { Severity } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`severity severity-${severity}`}><i />{severity}</span>;
}
