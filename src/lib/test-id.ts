/**
 * Test ids are how UI tests locate elements — never DOM structure, copy, or
 * class names. See the "Selecting elements" rules in CLAUDE.md.
 *
 * Values are unique-per-document, semantic dotted paths read outermost →
 * innermost: `home.todo.create.input`, `home.todo.1234.check.button`.
 */

/** Mix into a reusable component's props: `type Props = OwnProps & TestIdProps`. */
export type TestIdProps = { testId?: string };

/**
 * Spread onto an element to tag it: `<Checkbox {...props} {...testProp(id)} />`.
 *
 * Emits nothing when `testId` is undefined — stamping `data-test-id="undefined"`
 * on every untagged element would make them all match each other and break the
 * uniqueness rule.
 */
export function testProp(testId?: string): { "data-test-id"?: string } {
  return testId === undefined ? {} : { "data-test-id": testId };
}
