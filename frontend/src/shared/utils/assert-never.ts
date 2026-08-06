/**
 * Helper function for compile-time exhaustiveness checking in switch statements.
 * Triggers a TypeScript compilation error if any enum/union case is unhandled.
 */
export function assertNever(x: never): never {
  throw new Error(`Unexpected object: ${JSON.stringify(x)}`);
}
