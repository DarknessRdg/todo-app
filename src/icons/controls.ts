// One module per glyph rather than the package root: the root re-exports
// every icon Phosphor has, and importing it costs each spec file the lot.
import { CaretDownIcon } from "@phosphor-icons/react/dist/csr/CaretDown";
import { CaretLeftIcon } from "@phosphor-icons/react/dist/csr/CaretLeft";
import { CaretRightIcon } from "@phosphor-icons/react/dist/csr/CaretRight";
import { CaretUpIcon } from "@phosphor-icons/react/dist/csr/CaretUp";
import { CheckIcon } from "@phosphor-icons/react/dist/csr/Check";
import { CircleIcon } from "@phosphor-icons/react/dist/csr/Circle";
import { CircleNotchIcon } from "@phosphor-icons/react/dist/csr/CircleNotch";
import { MoonIcon } from "@phosphor-icons/react/dist/csr/Moon";
import { SpinnerGapIcon } from "@phosphor-icons/react/dist/csr/SpinnerGap";
import { SpinnerIcon } from "@phosphor-icons/react/dist/csr/Spinner";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { XIcon } from "@phosphor-icons/react/dist/csr/X";

import { defineIcon } from "./define-icon";

/* The furniture of controls: marks, disclosures, chevrons, spinners. */

/** A tick: a chosen menu item, a checked box, a completed todo's mark. */
export const CheckmarkIcon = defineIcon(CheckIcon);
/** The chosen item of a radio group. Filled: an empty ring would read as unchosen. */
export const RadioMarkIcon = defineIcon(CircleIcon, { weight: "fill" });
/** Closing a window: a dialog, a sheet. */
export const CloseIcon = defineIcon(XIcon);

/** A trigger that opens a menu below it. */
export const DropdownIcon = defineIcon(CaretDownIcon);
/** A section or tree row that opens in place; rotated by its caller. */
export const DisclosureIcon = defineIcon(CaretRightIcon);
/** A menu item that opens a further menu. */
export const SubmenuIcon = defineIcon(CaretRightIcon);
export const PreviousIcon = defineIcon(CaretLeftIcon);
export const NextIcon = defineIcon(CaretRightIcon);
export const ScrollUpIcon = defineIcon(CaretUpIcon);
export const ScrollDownIcon = defineIcon(CaretDownIcon);

/** Work in flight, drawn in place of the control that started it. */
export const LoadingIcon = defineIcon(SpinnerGapIcon);
export const LoadingRingIcon = defineIcon(CircleNotchIcon);
export const LoadingSpokesIcon = defineIcon(SpinnerIcon);

export const LightThemeIcon = defineIcon(SunIcon);
export const DarkThemeIcon = defineIcon(MoonIcon);
