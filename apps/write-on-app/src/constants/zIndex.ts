export const Z = {
  CONTROL_STRIP: 1000,
  WORKSPACE: 0,
} as const;

export type ZIndexKey = keyof typeof Z;
export type ZIndex = typeof Z[ZIndexKey];

