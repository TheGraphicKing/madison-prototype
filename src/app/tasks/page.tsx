import { Suspense } from "react";
import { Tasks } from "@/components/tasks/tasks";

export const metadata = { title: "My tasks" };

export default function TasksPage() {
  return (
    <Suspense>
      <Tasks />
    </Suspense>
  );
}
