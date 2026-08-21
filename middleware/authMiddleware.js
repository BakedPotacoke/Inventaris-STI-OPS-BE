import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: "Akses ditolak. Token tidak valid atau tidak ditemukan." });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_default');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ message: "Token tidak valid atau sudah kedaluwarsa." });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: "Akses ditolak." });
    }
};
