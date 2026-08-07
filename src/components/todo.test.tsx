import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TodoCheckerInput } from "@/components/todo";
import { renderWithContainer } from "@/test/container";
import { makeTodo } from "@/test/todo-factory";

// Derived from a generated id, so nothing here leans on a literal "1234".
const checkButton = `home.todo.${makeTodo().id}.check.button`;

describe("TodoCheckerInput", () => {
  it("when clicked while open, Then reports the completion", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderWithContainer(
      <TodoCheckerInput testId={checkButton} done={false} onToggle={onToggle} />
    );

    await user.click(screen.getByTestId(checkButton));

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("when clicked while done, Then reports the reopen", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderWithContainer(
      <TodoCheckerInput testId={checkButton} done onToggle={onToggle} />
    );

    await user.click(screen.getByTestId(checkButton));

    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("when disabled, Then a click reports nothing", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    renderWithContainer(
      <TodoCheckerInput
        testId={checkButton}
        done={false}
        disabled
        onToggle={onToggle}
      />
    );

    await user.click(screen.getByTestId(checkButton));

    expect(onToggle).not.toHaveBeenCalled();
  });

  it("when no testId is given, Then no data-test-id attribute is emitted", () => {
    const { container } = renderWithContainer(
      <TodoCheckerInput done={false} />
    );

    expect(container.querySelector("[data-test-id]")).toBeNull();
  });
});
