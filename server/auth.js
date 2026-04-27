const jwt = require("jsonwebtoken");
 

function authMiddleware(req, res, next) {
    const header = req.headers.authorization;

    if (!header) {
        return res.status(401).json({ message: "Token lipsă" });
    }

    const token = header.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Token invalid" });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET);
        req.user = decoded;
        return next();
    } catch {
        return res.status(403).json({ message: "Token nevalid" });
    }
}

module.exports = authMiddleware;