import { describe, expect, it } from "vitest";

import { searchEmojis, type Emoji } from "@/lib/emoji";

const tada: Emoji = {
  name: "tada",
  emoji: "🎉",
  shortcodes: ["party", "party_popper", "tada"],
  tags: ["celebrate", "party"],
};

const partyingFace: Emoji = {
  name: "partying_face",
  emoji: "🥳",
  shortcodes: ["partying_face"],
  tags: ["celebration"],
};

const rocket: Emoji = {
  name: "rocket",
  emoji: "🚀",
  shortcodes: ["rocket"],
  tags: ["ship", "launch"],
};

const ship: Emoji = {
  name: "ship",
  emoji: "🚢",
  shortcodes: ["ship"],
  tags: ["boat"],
};

const catalogue = [tada, partyingFace, rocket, ship];

describe("searchEmojis", () => {
  it("when the query is empty, Then it offers the catalogue as it stands", () => {
    expect(searchEmojis(catalogue, "")).toEqual(catalogue);
  });

  describe("when I search by shortcode", () => {
    it("Then it matches on a prefix rather than the whole word", () => {
      expect(searchEmojis(catalogue, "roc")).toEqual([rocket]);
    });

    it("Then any of an emoji's shortcodes finds it", () => {
      expect(searchEmojis(catalogue, "party_pop")).toEqual([tada]);
    });

    it("Then the case I typed does not matter", () => {
      expect(searchEmojis(catalogue, "ROCK")).toEqual([rocket]);
    });

    it("Then leading and trailing colons are ignored", () => {
      expect(searchEmojis(catalogue, ":rocket:")).toEqual([rocket]);
    });
  });

  describe("when I search by tag", () => {
    it("Then it finds emoji whose shortcodes do not mention the word", () => {
      expect(searchEmojis(catalogue, "launch")).toEqual([rocket]);
    });

    it("Then a shortcode match is offered ahead of a tag-only one", () => {
      // `rocket` is tagged "ship" and comes first in the catalogue; the emoji
      // actually *called* ship still wins.
      expect(searchEmojis(catalogue, "ship")).toEqual([ship, rocket]);
    });
  });

  it("when nothing matches, Then it offers nothing rather than everything", () => {
    expect(searchEmojis(catalogue, "zzz")).toEqual([]);
  });

  it("when a limit is given, Then it stops there", () => {
    expect(searchEmojis(catalogue, "", 2)).toEqual([tada, partyingFace]);
  });
});
