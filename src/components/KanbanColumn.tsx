import React from "react";
import type { JiraIssue } from "../types";
import TaskCard from "./TaskCard";

interface KanbanColumnProps {
  title: string;
  issues: JiraIssue[];
  statusColor?: string;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  title,
  issues,
  statusColor = "bg-gray-100",
}) => {
  return (
    <div className="flex-shrink-0 w-80">
      <div className={`${statusColor} rounded-lg p-3 mb-4`}>
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-gray-900">{title}</h2>
          <span className="bg-white text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
            {issues.length}
          </span>
        </div>
      </div>

      <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
        {issues.map((issue) => (
          <TaskCard key={issue.id} issue={issue} />
        ))}

        {issues.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No issues in this status</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
