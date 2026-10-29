import type { RolesType } from "#src/types/userType/userType.js";

/** Staff member as shown in the dashboard (no password hash, no restaurant_id) */
export interface StaffResponse {
  id: string;
  username: string;
  email: string;
  roles: RolesType;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

/** Input of Staff.create. restaurantId always comes from req.restaurantId */
export interface CreateStaffInput {
  restaurantId: string;
  username: string;
  email: string;
  passwordHash: string;          // bcrypt hash, hashed in the controller
  roles: Exclude<RolesType, "5150">;
}

/** Returned by Staff.remove so the controller can clean the cloud images of the deleted user */
export interface DeleteStaffResult {
  id: string;
  avatar_url: string;
  avatar_history: string[];
}