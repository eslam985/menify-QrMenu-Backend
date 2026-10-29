import ROLES_LIST from "#src/config/roles_list.js";
import { CustomError } from "#src/utils/customErr.js";
import type { RequestHandler } from "express";

// Higher rank = more privileges. A user passes if their rank >= the required rank.
const ROLE_RANK: Record<number, number> = {
  [ROLES_LIST.User]: 1,
  [ROLES_LIST.Editor]: 2,
  [ROLES_LIST.Admin]: 3,
};

const verifyRoles = (requiredRole: number | string): RequestHandler => {
  const required = Number(requiredRole);
  const requiredRank = ROLE_RANK[required];

  // Fail fast at startup if a route is misconfigured
  if (!requiredRank) {
    throw new CustomError(
      "خطأ في إعداد المسار: يجب تمرير رتبة صالحة لـ verifyRoles (مثل ROLES_LIST.Admin)",
      500,
    );
  }

  return (req, res, next) => {
    if (!req.roles) {
      res.status(401).json({ success: false, message: "غير مصرح، يرجى تسجيل الدخول" });
      return;
    }

    const userRank = ROLE_RANK[Number(req.roles)];
    if (!userRank) {
      res.status(403).json({ success: false, message: "غير مصرح لك بالدخول" });
      return;
    }

    if (userRank >= requiredRank) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      message:
        required === ROLES_LIST.Admin
          ? "هذا الإجراء متاح للآدمن فقط"
          : "هذا الإجراء يتطلب صلاحية محرر (Editor)",
    });
  };
};

export default verifyRoles;