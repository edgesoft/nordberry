import React from "react";
import { useNavigate, Link } from "@remix-run/react";
import { ringColors } from "../utils/colors";

interface TaskStepData {
  id: string;
  title: string;
  status: keyof typeof ringColors;
  assignments?: Array<{ userId: string }>;
}

interface TaskStepProps {
  step: TaskStepData;
  loggedInDbUserId: string | null | undefined;
  useLink?: boolean;
  className?: string;
}

function TaskStep({
  step,
  loggedInDbUserId,
  useLink = false,
  className = "",
}: TaskStepProps) {
  const navigate = useNavigate();

  const isUserAssigned =
    loggedInDbUserId &&
    step.assignments?.some(
      (assignment) => assignment.userId === loggedInDbUserId
    );

  const baseClasses =
    "flex items-center gap-1 px-2 py-0.5 text-xs rounded-md whitespace-nowrap transition-colors";

  const appearanceClasses = isUserAssigned
    ? "text-gray-300 bg-zinc-800 hover:bg-zinc-700"
    : "text-gray-500 bg-zinc-900 opacity-70";

  const cursorClass = isUserAssigned
    ? useLink
      ? ""
      : "cursor-pointer"
    : "cursor-not-allowed";

  const combinedClasses = `${baseClasses} ${appearanceClasses} ${cursorClass} ${className}`;

  const commonProps = {
    className: combinedClasses,
    title: isUserAssigned ? step.title : `${step.title} (ej tilldelad)`,
    "aria-disabled": !isUserAssigned,
  };

  const content = (
    <>
      <span className={`w-2 h-2 rounded-md ${ringColors[step.status]}`} />
      <span>{step.title}</span>
    </>
  );

  if (useLink) {
    if (isUserAssigned) {
      return (
        <Link to={`/task/${step.id}`} prefetch="intent" {...commonProps}>
          {content}
        </Link>
      );
    } else {
      return <div {...commonProps}>{content}</div>;
    }
  } else {
    return (
      <div
        {...commonProps}
        onClick={(e) => {
          if (isUserAssigned) {
            e.stopPropagation();
            e.preventDefault();
            navigate(`/task/${step.id}`);
          } else {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        role={isUserAssigned ? "button" : undefined}
        tabIndex={isUserAssigned ? 0 : -1}
        onKeyDown={(e) => {
          if (isUserAssigned && (e.key === 'Enter' || e.key === ' ')) {
             e.preventDefault();
             navigate(`/task/${step.id}`);
          }
       }}
      >
        {content}
      </div>
    );
  }
}

export default TaskStep;
