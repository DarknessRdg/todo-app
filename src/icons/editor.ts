// One module per glyph rather than the package root: the root re-exports
// every icon Phosphor has, and importing it costs each spec file the lot.
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowClockwise";
import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/csr/ArrowCounterClockwise";
import { CaretCircleDownIcon } from "@phosphor-icons/react/dist/csr/CaretCircleDown";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { CheckSquareIcon } from "@phosphor-icons/react/dist/csr/CheckSquare";
import { CodeBlockIcon as CodeBlockGlyph } from "@phosphor-icons/react/dist/csr/CodeBlock";
import { CodeIcon } from "@phosphor-icons/react/dist/csr/Code";
import { ColumnsIcon } from "@phosphor-icons/react/dist/csr/Columns";
import { ColumnsPlusLeftIcon } from "@phosphor-icons/react/dist/csr/ColumnsPlusLeft";
import { ColumnsPlusRightIcon } from "@phosphor-icons/react/dist/csr/ColumnsPlusRight";
import { HighlighterIcon } from "@phosphor-icons/react/dist/csr/Highlighter";
import { ImageIcon as ImageGlyph } from "@phosphor-icons/react/dist/csr/Image";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { LinkIcon as LinkGlyph } from "@phosphor-icons/react/dist/csr/Link";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/csr/ListBullets";
import { ListNumbersIcon } from "@phosphor-icons/react/dist/csr/ListNumbers";
import { MagnifyingGlassMinusIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlassMinus";
import { MagnifyingGlassPlusIcon } from "@phosphor-icons/react/dist/csr/MagnifyingGlassPlus";
import { ParagraphIcon as ParagraphGlyph } from "@phosphor-icons/react/dist/csr/Paragraph";
import { ProhibitIcon } from "@phosphor-icons/react/dist/csr/Prohibit";
import { QuotesIcon } from "@phosphor-icons/react/dist/csr/Quotes";
import { RowsIcon } from "@phosphor-icons/react/dist/csr/Rows";
import { RowsPlusBottomIcon } from "@phosphor-icons/react/dist/csr/RowsPlusBottom";
import { RowsPlusTopIcon } from "@phosphor-icons/react/dist/csr/RowsPlusTop";
import { SmileyIcon } from "@phosphor-icons/react/dist/csr/Smiley";
import { TableIcon as TableGlyph } from "@phosphor-icons/react/dist/csr/Table";
import { TextAlignCenterIcon } from "@phosphor-icons/react/dist/csr/TextAlignCenter";
import { TextAlignJustifyIcon } from "@phosphor-icons/react/dist/csr/TextAlignJustify";
import { TextAlignLeftIcon } from "@phosphor-icons/react/dist/csr/TextAlignLeft";
import { TextAlignRightIcon } from "@phosphor-icons/react/dist/csr/TextAlignRight";
import { TextBIcon } from "@phosphor-icons/react/dist/csr/TextB";
import { TextHOneIcon } from "@phosphor-icons/react/dist/csr/TextHOne";
import { TextHThreeIcon } from "@phosphor-icons/react/dist/csr/TextHThree";
import { TextHTwoIcon } from "@phosphor-icons/react/dist/csr/TextHTwo";
import { TextItalicIcon } from "@phosphor-icons/react/dist/csr/TextItalic";
import { TextStrikethroughIcon } from "@phosphor-icons/react/dist/csr/TextStrikethrough";
import { TextTIcon } from "@phosphor-icons/react/dist/csr/TextT";
import { TextUnderlineIcon } from "@phosphor-icons/react/dist/csr/TextUnderline";
import { TrashIcon } from "@phosphor-icons/react/dist/csr/Trash";
import { WarningIcon } from "@phosphor-icons/react/dist/csr/Warning";
import { XCircleIcon } from "@phosphor-icons/react/dist/csr/XCircle";

import { defineIcon } from "./define-icon";

/* The rich text editor's toolbar and the blocks it inserts. */

export const UndoIcon = defineIcon(ArrowCounterClockwiseIcon);
export const RedoIcon = defineIcon(ArrowClockwiseIcon);

export const ParagraphIcon = defineIcon(ParagraphGlyph);
export const Heading1Icon = defineIcon(TextHOneIcon);
export const Heading2Icon = defineIcon(TextHTwoIcon);
export const Heading3Icon = defineIcon(TextHThreeIcon);
export const BulletListIcon = defineIcon(ListBulletsIcon);
export const NumberedListIcon = defineIcon(ListNumbersIcon);
export const ChecklistIcon = defineIcon(CheckSquareIcon);
export const QuoteIcon = defineIcon(QuotesIcon);
export const CollapsibleIcon = defineIcon(CaretCircleDownIcon);

export const BoldIcon = defineIcon(TextBIcon);
export const ItalicIcon = defineIcon(TextItalicIcon);
export const StrikethroughIcon = defineIcon(TextStrikethroughIcon);
export const UnderlineIcon = defineIcon(TextUnderlineIcon);
export const HighlightIcon = defineIcon(HighlighterIcon);
/** The "no colour" swatch of the highlighter. */
export const NoColourIcon = defineIcon(ProhibitIcon);
export const InlineCodeIcon = defineIcon(CodeIcon);
export const CodeBlockIcon = defineIcon(CodeBlockGlyph);
export const LinkIcon = defineIcon(LinkGlyph);
/** The visible words of a link or an image. */
export const LinkTextIcon = defineIcon(TextTIcon);
export const ImageIcon = defineIcon(ImageGlyph);
export const EmojiIcon = defineIcon(SmileyIcon);

export const AlignLeftIcon = defineIcon(TextAlignLeftIcon);
export const AlignCenterIcon = defineIcon(TextAlignCenterIcon);
export const AlignRightIcon = defineIcon(TextAlignRightIcon);
export const AlignJustifyIcon = defineIcon(TextAlignJustifyIcon);

export const ImageShrinkIcon = defineIcon(MagnifyingGlassMinusIcon);
export const ImageGrowIcon = defineIcon(MagnifyingGlassPlusIcon);

export const TableIcon = defineIcon(TableGlyph);
export const InsertRowAboveIcon = defineIcon(RowsPlusTopIcon);
export const InsertRowBelowIcon = defineIcon(RowsPlusBottomIcon);
export const InsertColumnLeftIcon = defineIcon(ColumnsPlusLeftIcon);
export const InsertColumnRightIcon = defineIcon(ColumnsPlusRightIcon);
export const DeleteRowIcon = defineIcon(RowsIcon);
export const DeleteColumnIcon = defineIcon(ColumnsIcon);
export const DeleteBlockIcon = defineIcon(TrashIcon);

/** Callout tones. */
export const CalloutInfoIcon = defineIcon(InfoIcon);
export const CalloutWarningIcon = defineIcon(WarningIcon);
export const CalloutSuccessIcon = defineIcon(CheckCircleIcon);
export const CalloutErrorIcon = defineIcon(XCircleIcon);
