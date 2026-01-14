require("dotenv").config();
const jwt = require("jsonwebtoken");

//Middleware: ตรวจสอบความถูกต้องของ JWT Token
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");

  if (type?.toLowerCase() !== "bearer" || !token) {
    return res.status(401).json({
      message: "ต้องแนบโทเคน (Bearer <token>)",
    });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({
      message: "โทเคนไม่ถูกต้องหรือหมดอายุ",
    });
  }
}

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET not configured");
  }
  const payload = {
    us_id: user.us_id,
    us_user_name: user.us_user_name,
    us_prefix_th: user.us_prefix_th || "",
    us_first_name_th: user.us_first_name_th || "",
    us_last_name_th: user.us_last_name_th || "",
    us_first_name_en: user.us_first_name_en || "",
    us_last_name_en: user.us_last_name_en || "",
    us_tel: user.us_tel || "",
    us_department: user.us_department || "",
    role_name: user.role_name || "",
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "1d",
    issuer: "fixdesk-api",
    audience: "fixdesk-client",
  });
}

module.exports = { authMiddleware, signToken };
