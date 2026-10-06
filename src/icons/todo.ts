// One module per glyph rather than the package root: the root re-exports
// every icon Phosphor has, and importing it costs each spec file the lot.
import { BookOpenIcon } from "@phosphor-icons/react/dist/csr/BookOpen";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/csr/CalendarBlank";
import { CellSignalHighIcon } from "@phosphor-icons/react/dist/csr/CellSignalHigh";
import { CellSignalLowIcon } from "@phosphor-icons/react/dist/csr/CellSignalLow";
import { CellSignalMediumIcon } from "@phosphor-icons/react/dist/csr/CellSignalMedium";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CircleDashedIcon } from "@phosphor-icons/react/dist/csr/CircleDashed";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { FeatherIcon } from "@phosphor-icons/react/dist/csr/Feather";
import { FolderSimpleIcon } from "@phosphor-icons/react/dist/csr/FolderSimple";
import { ListChecksIcon } from "@phosphor-icons/react/dist/csr/ListChecks";
import { PencilSimpleLineIcon } from "@phosphor-icons/react/dist/csr/PencilSimpleLine";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";

import { defineIcon } from "./define-icon";

/* What a todo is made of: its status, its properties, its parts. */

/** A todo still to be done, as a status. */
export const OpenStatusIcon = defineIcon(CircleDashedIcon);
/** A todo that is done, as a status. */
export const DoneStatusIcon = defineIcon(CheckCircleIcon);
/** The status property itself, before it has a value. */
export const StatusIcon = defineIcon(CircleDashedIcon);
/** Open todos, counted. */
export const OpenCountIcon = defineIcon(CircleIcon);

export const DueDateIcon = defineIcon(CalendarBlankIcon);
export const ProjectIcon = defineIcon(FolderSimpleIcon);
export const SubtasksIcon = defineIcon(ListChecksIcon);

/** The priority property, and the filter over it. */
export const PriorityIcon = defineIcon(CellSignalHighIcon);
export const PriorityLowIcon = defineIcon(CellSignalLowIcon);
export const PriorityMediumIcon = defineIcon(CellSignalMediumIcon);
export const PriorityHighIcon = defineIcon(CellSignalHighIcon);
export const PriorityUrgentIcon = defineIcon(WarningIcon);

/** The description, being read rather than written. */
export const ReadingIcon = defineIcon(BookOpenIcon);
/** The description, being written. */
export const WritingIcon = defineIcon(PencilSimpleLineIcon);

/** Capturing a first thought: the empty list's invitation. */
export const CaptureIcon = defineIcon(FeatherIcon);
