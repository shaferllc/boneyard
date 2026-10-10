import { Model } from "@shaferllc/keel/core";

import type { TierKey, Shape, Emblem } from "../Domain/graveyard.js";
import type { DecayState } from "../Domain/decay.js";

export class Grave extends Model {
  static override table = "graves";
  static override fillable = [
    "slug",
    "name",
    "tier",
    "slot",
    "url",
    "logo_url",
    "died",
    "cause",
    "handle",
    "shape",
    "emblem",
    "epitaph",
    "description",
    "paid_at",
    "checkout_id",
    "domain_state",
    "domain_expires_at",
    "domain_checked_at",
  ];
  static override timestamps = true;

  declare id: number;
  declare slug: string;
  declare name: string;
  declare tier: TierKey;
  declare slot: number | null;
  declare url: string | null;
  declare logo_url: string | null;
  declare died: string | null;
  declare cause: string | null;
  declare handle: string | null;
  declare shape: Shape;
  declare emblem: Emblem;
  declare epitaph: string | null;
  declare description: string | null;
  declare paid_at: string | null;
  declare checkout_id: string | null;
  declare domain_state: DecayState;
  declare domain_expires_at: string | null;
  declare domain_checked_at: string | null;
  declare views: number;
  declare created_at: string;
}
