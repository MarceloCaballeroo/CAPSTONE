import type { PropsWithChildren } from "react";
import { DashboardLayout } from "@/layouts/DashboardLayout";

export default function DashboardRouteLayout({ children }: PropsWithChildren) {
  return <DashboardLayout>{children}</DashboardLayout>;
}