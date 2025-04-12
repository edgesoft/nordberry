import React from 'react';
import { useNavigate, Link } from '@remix-run/react'; // Importera Link
import { ringColors } from '../utils/colors'; // Anpassa sökväg

// Interface för task-data (samma som tidigare)
interface TaskStepData {
  id: string;
  title: string;
  status: keyof typeof ringColors;
  assignments?: Array<{ userId: string }>;
}

// Props för den uppdaterade komponenten
interface TaskStepProps {
  step: TaskStepData;
  loggedInDbUserId: string | null | undefined;
  useLink?: boolean; // Ny prop för att välja Link eller div
  className?: string;
}

// Byt namn på komponenten för att spegla dess flexibilitet
function TaskStep({
  step,
  loggedInDbUserId,
  useLink = false, // Default till false (rendera div)
  className = '',
}: TaskStepProps) {
  const navigate = useNavigate();

  const isUserAssigned = loggedInDbUserId && step.assignments?.some(
    (assignment) => assignment.userId === loggedInDbUserId
  );

  const baseClasses = "flex items-center gap-1 px-2 py-0.5 text-xs rounded-md whitespace-nowrap transition-colors";
  // Klasser för utseende baserat på om användaren är assignad
  const appearanceClasses = isUserAssigned
    ? "text-gray-300 bg-zinc-800 hover:bg-zinc-700" // Interaktivt utseende
    : "text-gray-500 bg-zinc-900 opacity-70";       // Icke-interaktivt utseende

  // Klass för cursor baserat på interaktivitet och elementtyp
  const cursorClass = isUserAssigned
    ? (useLink ? '' : 'cursor-pointer') // Link har egen cursor, div behöver om assignad
    : 'cursor-not-allowed';             // Ingen interaktion om ej assignad

  // Kombinera alla klasser
  const combinedClasses = `${baseClasses} ${appearanceClasses} ${cursorClass} ${className}`;

  // ----- Gemensamma props för Link och div -----
  const commonProps = {
    // key ska sättas i .map() där komponenten används
    className: combinedClasses,
    title: isUserAssigned ? step.title : `${step.title} (ej tilldelad)`,
    'aria-disabled': !isUserAssigned,
  };

  // ----- Gemensamt innehåll -----
  const content = (
    <>
      <span className={`w-2 h-2 rounded-md ${ringColors[step.status]}`} />
      <span>{step.title}</span>
    </>
  );


  if (useLink) {
    if (isUserAssigned) {
      return (
        <Link
          to={`/task/${step.id}`}
          prefetch="intent"
          {...commonProps}
        >
          {content}
        </Link>
      );
    } else {
      return (
        <div {...commonProps}>
          {content}
        </div>
      );
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
        role={isUserAssigned ? "button" : undefined} // Tillgänglighet för klickbar div
        tabIndex={isUserAssigned ? 0 : -1}       // Gör klickbar div fokuserbar
      >
        {content}
      </div>
    );
  }
}

export default TaskStep; // Exportera den uppdaterade komponenten