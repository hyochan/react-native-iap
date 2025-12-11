/**
 * Extract error message from various error formats
 * Handles Error objects, objects with errors array, and other formats
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  // Handle primitive types - preserve the original message
  if (
    typeof error === 'string' ||
    typeof error === 'number' ||
    typeof error === 'boolean'
  ) {
    return String(error);
  }

  if (
    error &&
    typeof error === 'object' &&
    'errors' in error &&
    Array.isArray((error as {errors: unknown[]}).errors)
  ) {
    const errors = (error as {errors: {message?: string}[]}).errors;
    if (errors.length === 0) {
      return 'Unknown error';
    }
    return errors[0]?.message || JSON.stringify(errors[0]) || 'Unknown error';
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as {message: unknown}).message);
  }

  return String(error ?? 'Unknown error');
}
