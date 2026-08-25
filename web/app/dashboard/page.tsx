import type { Metadata } from "next";
import { DashboardApp } from "@/components/dashboard/DashboardApp";

import { fetchLiveSeedData } from "@/lib/data";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Live operator console for a Nodeframe Core Hub — module readouts, activity log, and the plugin marketplace.",
};

export default async function DashboardPage() {
  const data = await fetchLiveSeedData();
  return <DashboardApp initialData={data} />;
}
