// One module per glyph rather than the package root: the root re-exports
// every icon Phosphor has, and importing it costs each spec file the lot.
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/csr/ArrowLeft";
import { CalendarDotsIcon } from "@phosphor-icons/react/dist/csr/CalendarDots";
import { CalendarXIcon } from "@phosphor-icons/react/dist/csr/CalendarX";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/csr/CheckCircle";
import { GearIcon } from "@phosphor-icons/react/dist/csr/Gear";
import { InfoIcon } from "@phosphor-icons/react/dist/csr/Info";
import { ListChecksIcon } from "@phosphor-icons/react/dist/csr/ListChecks";
import { NotePencilIcon } from "@phosphor-icons/react/dist/csr/NotePencil";
import { PaletteIcon } from "@phosphor-icons/react/dist/csr/Palette";
import { SidebarSimpleIcon } from "@phosphor-icons/react/dist/csr/SidebarSimple";
import { SunIcon } from "@phosphor-icons/react/dist/csr/Sun";
import { TagIcon } from "@phosphor-icons/react/dist/csr/Tag";
import { TrayIcon } from "@phosphor-icons/react/dist/csr/Tray";

import { defineIcon } from "./define-icon";

/* The views and places the sidebar and settings lead to. */

export const InboxIcon = defineIcon(TrayIcon);
export const TodayIcon = defineIcon(SunIcon);
export const UpcomingIcon = defineIcon(CalendarDotsIcon);
export const OverdueIcon = defineIcon(CalendarXIcon);
export const CompletedIcon = defineIcon(CheckCircleIcon);
export const LabelIcon = defineIcon(TagIcon);
export const SettingsIcon = defineIcon(GearIcon);
export const BackIcon = defineIcon(ArrowLeftIcon);
export const SidebarToggleIcon = defineIcon(SidebarSimpleIcon);

/** Settings sections. */
export const AppearanceIcon = defineIcon(PaletteIcon);
export const ListsSettingsIcon = defineIcon(ListChecksIcon);
export const TodosSettingsIcon = defineIcon(NotePencilIcon);
export const AboutIcon = defineIcon(InfoIcon);
