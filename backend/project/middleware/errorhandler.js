export function errorHandler(err, req, res, next) {
    console.error(err.stack);

    res.status(err.status || 500).json({
        msg: err.message || "Internal server error"
    });
}

export default {
    errorHandler
};
