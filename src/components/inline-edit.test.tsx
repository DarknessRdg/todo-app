import { fireEvent, render, screen } from "@testing-library/react";
import { setupUser, waitFor } from "@/test/user";
import { describe, expect, it, vi } from "vitest";

import { InlineEdit } from "@/components/inline-edit";

const read = "field";
const input = "field.input";

/** The preset arrangement: a heading that becomes a text field. */
function renderInlineEdit({
  value = "the stored value",
  required = false,
  readOnly = false,
}: { value?: string; required?: boolean; readOnly?: boolean } = {}) {
  const onCommit = vi.fn<(next: string) => void>();

  const field = (isReadOnly: boolean) => (
    <InlineEdit
      value={value}
      required={required}
      readOnly={isReadOnly}
      onCommit={onCommit}>
      <InlineEdit.Read asChild testId={read} aria-label="Edit it">
        <h1>{value}</h1>
      </InlineEdit.Read>
      <InlineEdit.Input testId={input} />
    </InlineEdit>
  );

  const { rerender } = render(field(readOnly));

  // Read-only is a prop the caller flips while this stays mounted — a toggle
  // beside the value, not a different screen — so specs drive it the same way.
  return { onCommit, setReadOnly: (next: boolean) => rerender(field(next)) };
}

describe("inline edit", () => {
  describe("when I click the read view", () => {
    it("Then it becomes a field holding the stored value", async () => {
      const user = setupUser();
      renderInlineEdit({ value: "the stored value" });

      await user.click(screen.getByTestId(read));

      expect(await screen.findByTestId(input)).toHaveValue("the stored value");
    });

    it("Then the read view gives way to it", async () => {
      const user = setupUser();
      renderInlineEdit();

      await user.click(screen.getByTestId(read));

      await screen.findByTestId(input);
      expect(screen.queryByTestId(read)).not.toBeInTheDocument();
    });
  });

  describe("when I change the value and leave the field", () => {
    it("Then the new value is reported", async () => {
      const user = setupUser();
      const { onCommit } = renderInlineEdit();

      await user.click(screen.getByTestId(read));
      const field = await screen.findByTestId(input);

      await user.clear(field);
      await user.type(field, "something else");
      fireEvent.blur(field);

      await waitFor(() =>
        expect(onCommit).toHaveBeenCalledWith("something else")
      );
    });

    it("Then it is reported trimmed", async () => {
      const user = setupUser();
      const { onCommit } = renderInlineEdit();

      await user.click(screen.getByTestId(read));
      const field = await screen.findByTestId(input);

      await user.clear(field);
      await user.type(field, "  padded  ");
      fireEvent.blur(field);

      await waitFor(() => expect(onCommit).toHaveBeenCalledWith("padded"));
    });

    it("Then it goes back to reading as content", async () => {
      const user = setupUser();
      renderInlineEdit();

      await user.click(screen.getByTestId(read));
      fireEvent.blur(await screen.findByTestId(input));

      await waitFor(() => expect(screen.getByTestId(read)).toBeInTheDocument());
    });

    it("Then an unchanged value is not reported", async () => {
      const user = setupUser();
      const { onCommit } = renderInlineEdit();

      await user.click(screen.getByTestId(read));
      fireEvent.blur(await screen.findByTestId(input));

      await waitFor(() => expect(screen.getByTestId(read)).toBeInTheDocument());
      expect(onCommit).not.toHaveBeenCalled();
    });
  });

  describe("when I press enter", () => {
    it("Then the change is reported without leaving the field", async () => {
      const user = setupUser();
      const { onCommit } = renderInlineEdit();

      await user.click(screen.getByTestId(read));
      const field = await screen.findByTestId(input);

      await user.clear(field);
      await user.type(field, "something else{Enter}");

      await waitFor(() =>
        expect(onCommit).toHaveBeenCalledWith("something else")
      );
    });

    /** Closing the field on enter also blurs it, which would commit twice. */
    it("Then it is reported once, not once per way of closing", async () => {
      const user = setupUser();
      const { onCommit } = renderInlineEdit();

      await user.click(screen.getByTestId(read));
      const field = await screen.findByTestId(input);

      await user.clear(field);
      await user.type(field, "something else{Enter}");
      fireEvent.blur(field);

      await waitFor(() => expect(onCommit).toHaveBeenCalledTimes(1));
    });
  });

  describe("when I press escape", () => {
    it("Then nothing is reported", async () => {
      const user = setupUser();
      const { onCommit } = renderInlineEdit();

      await user.click(screen.getByTestId(read));
      const field = await screen.findByTestId(input);

      await user.clear(field);
      await user.type(field, "something else{Escape}");

      await waitFor(() => expect(screen.getByTestId(read)).toBeInTheDocument());
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("Then reopening starts from the stored value again", async () => {
      const user = setupUser();
      renderInlineEdit({ value: "the stored value" });

      await user.click(screen.getByTestId(read));
      const field = await screen.findByTestId(input);

      await user.clear(field);
      await user.type(field, "abandoned{Escape}");

      await user.click(await screen.findByTestId(read));

      expect(await screen.findByTestId(input)).toHaveValue("the stored value");
    });
  });

  it("when the value is required, Then clearing it reports nothing", async () => {
    const user = setupUser();
    const { onCommit } = renderInlineEdit({ required: true });

    await user.click(screen.getByTestId(read));
    const field = await screen.findByTestId(input);

    await user.clear(field);
    fireEvent.blur(field);

    await waitFor(() => expect(screen.getByTestId(read)).toBeInTheDocument());
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("when the value is not required, Then clearing it reports the empty value", async () => {
    const user = setupUser();
    const { onCommit } = renderInlineEdit();

    await user.click(screen.getByTestId(read));
    const field = await screen.findByTestId(input);

    await user.clear(field);
    fireEvent.blur(field);

    await waitFor(() => expect(onCommit).toHaveBeenCalledWith(""));
  });

  describe("when it is read only", () => {
    it("Then clicking the read view leaves it as content", async () => {
      const user = setupUser();
      renderInlineEdit({ readOnly: true });

      await user.click(screen.getByTestId(read));

      expect(screen.queryByTestId(input)).not.toBeInTheDocument();
      expect(screen.getByTestId(read)).toBeInTheDocument();
    });

    it("Then the keyboard route into the field is gone too", async () => {
      renderInlineEdit({ readOnly: true });

      fireEvent.keyDown(screen.getByTestId(read), { key: "Enter" });

      expect(screen.queryByTestId(input)).not.toBeInTheDocument();
    });
  });

  describe("when it turns read only while I am editing", () => {
    it("Then the open field gives way to the read view", async () => {
      const user = setupUser();
      const { setReadOnly } = renderInlineEdit();

      await user.click(screen.getByTestId(read));
      await screen.findByTestId(input);

      setReadOnly(true);

      expect(await screen.findByTestId(read)).toBeInTheDocument();
      expect(screen.queryByTestId(input)).not.toBeInTheDocument();
    });
  });

  it("when read only is lifted, Then the value can be edited again", async () => {
    const user = setupUser();
    const { setReadOnly } = renderInlineEdit({ readOnly: true });

    setReadOnly(false);
    await user.click(screen.getByTestId(read));

    expect(await screen.findByTestId(input)).toBeInTheDocument();
  });

  describe("when the control is not a plain field", () => {
    /** `InlineEdit.Edit` is the escape hatch for controls that hold their own value. */
    function renderWithCustomControl() {
      const onCommit = vi.fn<(next: string) => void>();

      render(
        <InlineEdit value="the stored value" onCommit={onCommit}>
          <InlineEdit.Read testId={read}>the stored value</InlineEdit.Read>
          <InlineEdit.Edit>
            {({ commit }) => (
              <button
                data-test-id="custom.control"
                onClick={() => commit("handed back")}>
                save
              </button>
            )}
          </InlineEdit.Edit>
        </InlineEdit>
      );

      return { onCommit };
    }

    it("Then the value it hands back is what gets reported", async () => {
      const user = setupUser();
      const { onCommit } = renderWithCustomControl();

      await user.click(screen.getByTestId(read));
      await user.click(await screen.findByTestId("custom.control"));

      await waitFor(() => expect(onCommit).toHaveBeenCalledWith("handed back"));
    });
  });
});
