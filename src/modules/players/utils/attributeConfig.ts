// Hybrid Attribute System — shared config for position-aware player attributes

export const POSITION_GROUPS = {
  GK: ["Goalkeeper"],
  DEF: ["Center Back", "Right Back", "Left Back"],
  CDM: ["Defensive Mid"],
  CAM_WING: ["Midfielder", "Attacking Mid", "Right Winger", "Left Winger"],
  ST: ["Striker"],
} as const;

export type PositionGroup = keyof typeof POSITION_GROUPS;

export const PHYSICAL_ATTRIBUTES = [
  "pace",
  "stamina",
  "strength",
  "agility",
  "jumping",
] as const;

export type PhysicalAttribute = (typeof PHYSICAL_ATTRIBUTES)[number];

export const TECHNICAL_ATTRIBUTES: Record<PositionGroup, readonly string[]> = {
  GK: [
    "reflexes",
    "positioning",
    "handling",
    "distribution",
    "aerial_command",
    "one_on_one",
  ],
  DEF: [
    "marking",
    "tackling",
    "heading",
    "interceptions",
    "crossing",
    "build_up_play",
  ],
  CDM: [
    "ball_recovery",
    "pressing",
    "passing_range",
    "positional_discipline",
    "shielding",
    "through_balls",
  ],
  CAM_WING: [
    "dribbling",
    "vision",
    "key_passing",
    "long_shots",
    "ball_control",
    "creativity",
  ],
  ST: [
    "finishing",
    "off_the_ball",
    "heading",
    "hold_up_play",
    "composure",
    "penalty_taking",
  ],
} as const;

export interface TechnicalAttributesJson {
  group: PositionGroup;
  attributes: Record<string, number>;
}

/** Map a position string to its position group, or null if not found */
export function getPositionGroup(
  position: string | null | undefined,
): PositionGroup | null {
  if (!position) return null;
  for (const [group, positions] of Object.entries(POSITION_GROUPS)) {
    if ((positions as readonly string[]).includes(position)) {
      return group as PositionGroup;
    }
  }
  return null;
}

/** Create a zero-filled technical attributes object for a given group */
export function createEmptyTechnicalAttributes(
  group: PositionGroup,
): TechnicalAttributesJson {
  const attributes: Record<string, number> = {};
  for (const key of TECHNICAL_ATTRIBUTES[group]) {
    attributes[key] = 0;
  }
  return { group, attributes };
}

/** Validate that a technical attributes object matches the expected shape for its group */
export function validateTechnicalAttributes(
  data: unknown,
): data is TechnicalAttributesJson {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (
    typeof obj.group !== "string" ||
    !Object.keys(POSITION_GROUPS).includes(obj.group)
  )
    return false;
  if (!obj.attributes || typeof obj.attributes !== "object") return false;

  const group = obj.group as PositionGroup;
  const expectedKeys = TECHNICAL_ATTRIBUTES[group];
  const attrs = obj.attributes as Record<string, unknown>;

  for (const key of expectedKeys) {
    if (typeof attrs[key] !== "number" || attrs[key] < 0 || attrs[key] > 100)
      return false;
  }
  return true;
}
