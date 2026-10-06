import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColourPicker } from "@/components/colour-picker";
import { setupUser } from "@/test/user";

describe("ColourPicker", () => {
  it("when I click a swatch, Then it reports that colour", async () => {
    const user = setupUser();
    const onChange = vi.fn();
    render(<ColourPicker testId="picker" value="gray" onChange={onChange} />);

    await user.click(screen.getByTestId("picker.green"));

    expect(onChange).toHaveBeenCalledWith("green");
  });

  it("when it opens on a colour, Then that swatch is the one marked as chosen", () => {
    render(<ColourPicker testId="picker" value="pink" onChange={vi.fn()} />);

    expect(screen.getByTestId("picker.pink")).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });

  it("when nothing has been picked yet, Then gray is marked as chosen", () => {
    render(
      <ColourPicker testId="picker" value={undefined} onChange={vi.fn()} />
    );

    expect(screen.getByTestId("picker.gray")).toHaveAttribute(
      "aria-checked",
      "true"
    );
  });
});
