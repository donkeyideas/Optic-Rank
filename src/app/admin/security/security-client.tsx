"use client";

import { SecurityTab } from "@/app/dashboard/settings/security-tab";

interface MFAFactor {
  id: string;
  friendlyName: string | null;
  status: string;
}

interface Props {
  mfaEnabled: boolean;
  mfaFactors: MFAFactor[];
}

export function SecurityClient({ mfaEnabled, mfaFactors }: Props) {
  return (
    <div className="mx-auto max-w-2xl">
      <SecurityTab initialEnabled={mfaEnabled} initialFactors={mfaFactors} />
    </div>
  );
}
