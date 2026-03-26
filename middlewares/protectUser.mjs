import { supabaseAdmin } from "../utils/supabase.mjs";

const protectUser = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token || token.length < 10) {
    return res.status(401).json({ error: "Unauthorized: Token missing" });
  }
  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data.user) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }
    req.user = { id: data.user.id, email: data.user.email };
    next();
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
};
export default protectUser;
