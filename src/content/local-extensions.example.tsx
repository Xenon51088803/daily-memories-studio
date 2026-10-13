import type { StudioExtension } from '@/lib/extensions';

// Optional owner-only integrations live in the ignored local-extensions.tsx.
// The shared template has no integrations enabled.
export function PublicExtensions() { return null; }
export const studioExtensions: StudioExtension[] = [];
