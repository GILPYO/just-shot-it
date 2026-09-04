export type CardType = "weapon" | "ammo" | "passive" | "stat";

export type LevelUpCard = {
  id: string;
  type: CardType;
  name: string;
  description: string;
  levelFrom: number;
  levelTo: number;
};

export const TYPE_COLOR: Record<CardType, string> = {
  weapon: "#9AA694",
  ammo: "#E8A33D",
  stat: "#49a0ab",
  passive: "#aa44ff",
};

export const TYPE_LABEL: Record<CardType, string> = {
  weapon: "WEAPON",
  ammo: "AMMO",
  stat: "STAT",
  passive: "PASSIVE",
};
