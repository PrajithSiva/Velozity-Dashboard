import { TaskStatus } from "../types";

const LABEL: Record<TaskStatus, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`badge badge-status-${status.toLowerCase()}`}>{LABEL[status]}</span>;
}
