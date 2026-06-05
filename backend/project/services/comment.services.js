const VALID_TARGET_TYPES = ["game", "tournament"];

export function isValidTargetType(targetType) {
    return VALID_TARGET_TYPES.includes(targetType);
}

export function buildCommentFilter(targetId, targetType, userRole) {
    return {
        targetId,
        targetType,
        ...(userRole !== "admin" && { isDeleted: false })
    };
}

export default {
    isValidTargetType,
    buildCommentFilter
};
