import { Model } from "@shaferllc/keel/core";

export class Sponsor extends Model {
  static override table = "sponsors";
  static override fillable = ["name", "url", "logo_url", "tagline", "expires_at", "paid_at", "checkout_id"];
  static override timestamps = true;

  declare id: number;
  declare name: string;
  declare url: string;
  declare logo_url: string | null;
  declare tagline: string | null;
  declare expires_at: string;
  declare paid_at: string | null;
  declare checkout_id: string | null;
}
