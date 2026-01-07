const jwt = require('jsonwebtoken');

exports.authenticateStudent = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if(!token) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized, token missing"
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if(decoded.role !== 'student') {
            return res.status(403).json({
                success: false,
                error: "Forbidden, access is allowed for students only"
            });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({
            success: false,
            error: "Unauthorized, token missing or invalid"
        });
    }
};

exports.authenticateTeacher = (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if(!token) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized, token missing"
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if(decoded.role !== 'teacher') {
            return res.status(403).json({
                success: false,
                error: "Forbidden, access is allowed for teachers only"
            });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({
            success: false,
            error: "Unauthorized, token missing or invalid"
        });
    }
};

exports.authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];

        if(!token) {
            return res.status(401).json({
                success: false,
                error: "Unauthorized, token missing"
            });
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({
            success: false,
            error: "Unauthorized, token missing or invalid"
        });
    }
};