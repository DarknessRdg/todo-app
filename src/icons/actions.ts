// One module per glyph rather than the package root: the root re-exports
// every icon Phosphor has, and importing it costs each spec file the lot.
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/csr/ArrowSquareOut";
import { ArrowUpIcon } from "@phosphor-icons/react/dist/csr/ArrowUp";
import { ArrowsDownUpIcon } from "@phosphor-icons/react/dist/csr/ArrowsDownUp";
import { ArrowsOutIcon } from "@phosphor-icons/react/dist/csr/ArrowsOut";
import { BugIcon } from "@phosphor-icons/react/dist/csr/Bug";
import { CopyIcon as CopyGlyph } from "@phosphor-icons/react/dist/csr/Copy";
import { DotsThreeIcon } from "@phosphor-icons/react/dist/csr/DotsThree";
import { FolderOpenIcon } from "@phosphor-icons/react/dist/csr/FolderOpen";
import { FunnelXIcon } from "@phosphor-icons/react/dist/csr/FunnelX";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/csr/GithubLogo";
import { ListPlusIcon } from "@phosphor-icons/react/dist/csr/ListPlus";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlass";
import { PaperPlaneRightIcon } from "@phosphor-icons/react/dist/csr/PaperPlaneRight";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/csr/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/csr/Plus";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";

import { defineIcon } from "./define-icon";

/* Things the user does. */

export const AddIcon = defineIcon(PlusIcon);
export const DeleteIcon = defineIcon(TrashIcon);
export const RenameIcon = defineIcon(PencilSimpleIcon);
export const CopyIcon = defineIcon(CopyGlyph);
/** Taking a value off: a filter, a label, a chip. Not closing a window. */
export const RemoveIcon = defineIcon(XIcon);
export const MoveToProjectIcon = defineIcon(FolderOpenIcon);
export const AssignTodosIcon = defineIcon(ListPlusIcon);
export const MoreActionsIcon = defineIcon(DotsThreeIcon);
export const RetryIcon = defineIcon(ArrowClockwiseIcon);
/** Opening a todo out of the modal into its own page. */
export const OpenFullPageIcon = defineIcon(ArrowsOutIcon);
export const ExternalLinkIcon = defineIcon(ArrowSquareOutIcon);
export const SubmitIcon = defineIcon(PaperPlaneRightIcon);
/** Points at the capture bar above an empty list. */
export const PointUpIcon = defineIcon(ArrowUpIcon);

export const SearchIcon = defineIcon(MagnifyingGlassIcon);
/** A search or filter that matched nothing. */
export const NoMatchesIcon = defineIcon(FunnelXIcon);
export const SortIcon = defineIcon(ArrowsDownUpIcon);

export const SourceCodeIcon = defineIcon(GithubLogoIcon);
export const ReportIssueIcon = defineIcon(BugIcon);
