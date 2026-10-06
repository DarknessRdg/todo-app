/**
 * The colours a category can wear: a priority, a due state, a view in the
 * sidebar, and (picked by the user) a label or a project.
 *
 * Each name is a pair of tokens in `src/index.css`, a washed-out fill and a
 * text colour that reads on it, tuned for both themes. Retune them there; this
 * file only names them. The class strings are written out in full because
 * Tailwind finds classes by reading the source, and a class assembled at
 * runtime (`bg-tint-${name}`) is one it never sees.
 */
export const Tints = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
] as const;

export type Tint = (typeof Tints)[number];

/** A filled chip: the tint behind its own text colour. */
export const tintFill: Record<Tint, string> = {
  gray: "bg-tint-gray text-tint-gray-foreground",
  brown: "bg-tint-brown text-tint-brown-foreground",
  orange: "bg-tint-orange text-tint-orange-foreground",
  yellow: "bg-tint-yellow text-tint-yellow-foreground",
  green: "bg-tint-green text-tint-green-foreground",
  blue: "bg-tint-blue text-tint-blue-foreground",
  purple: "bg-tint-purple text-tint-purple-foreground",
  pink: "bg-tint-pink text-tint-pink-foreground",
  red: "bg-tint-red text-tint-red-foreground",
};

/** The tint as a colour on its own: an icon, a swatch's dot of text. */
export const tintText: Record<Tint, string> = {
  gray: "text-tint-gray-foreground",
  brown: "text-tint-brown-foreground",
  orange: "text-tint-orange-foreground",
  yellow: "text-tint-yellow-foreground",
  green: "text-tint-green-foreground",
  blue: "text-tint-blue-foreground",
  purple: "text-tint-purple-foreground",
  pink: "text-tint-pink-foreground",
  red: "text-tint-red-foreground",
};

/** The tint as a solid swatch, for a colour picker. */
export const tintSwatch: Record<Tint, string> = {
  gray: "bg-tint-gray-foreground",
  brown: "bg-tint-brown-foreground",
  orange: "bg-tint-orange-foreground",
  yellow: "bg-tint-yellow-foreground",
  green: "bg-tint-green-foreground",
  blue: "bg-tint-blue-foreground",
  purple: "bg-tint-purple-foreground",
  pink: "bg-tint-pink-foreground",
  red: "bg-tint-red-foreground",
};
