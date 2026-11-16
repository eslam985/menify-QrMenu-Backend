import { Router } from "express";

import { importMenuBulk } from "#src/controllers/data/menuBulkController.js";
import verifyRoles from "#src/middleware/verifyRoles.js";
import ROLES_LIST from "#src/config/roles_list.js";

const router = Router();

router.post("/bulk-import", verifyRoles(ROLES_LIST.Admin), importMenuBulk);

export default router;