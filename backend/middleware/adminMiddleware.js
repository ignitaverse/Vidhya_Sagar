/* FEATURE (naya): Owner-only routes ke liye EK jagah se admin-check.
   Pehle server.js mein notifications route ke andar seedha yeh 3 lines
   inline likhi hui thi (x-admin-secret header vs process.env.ADMIN_SECRET).
   Ab jitni bhi owner-only cheezein aa rahi hain (exam/paragraph add,
   premium code generate/cancel, owner-chat inbox), sab isi EK middleware
   se guzarti hain - kahin bhi galti se check bhool jaana ya alag tarah
   se likh dena, dono ki gunjaish kam ho jaati hai. */
const requireAdminSecret = (req, res, next) => {
  const secret = req.headers['x-admin-secret'];
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
};

module.exports = { requireAdminSecret };
