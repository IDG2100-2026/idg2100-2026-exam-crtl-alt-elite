import mongoose from "mongoose";

// Two types of security incidents are tracked:
// 1. rate_limit: someone exceeding the API rate limit
// 2. ip_mismatch: a request IP not matching the IP stored in the access token
const securityIncidentSchema = new mongoose.Schema({
    // The type of security incident
    type: {
        type: String,
        enum: ["rate_limit", "ip_mismatch"],
        required: true
    },

    // The userId of the user involved, if known
    // null for rate limit incidents from anonymous users
    userId: {
        type: Number,
        default: null
    },

    // The IP address of the request
    ip: {
        type: String,
        required: true
    },

    // The user agent of the request
    // Helps identify the browser or client making the request
    userAgent: {
        type: String,
        default: null
    },

    // Additional detail about the incident
    // For ip_mismatch: shows both the token IP and request IP
    // For rate_limit: shows which endpoint was hit
    detail: {
        type: String,
        default: null
    }
},
{
    // createdAt is used to display when the incident occurred in the admin dashboard
    timestamps: true,
    toJSON: {
        transform: (secIncidentDoc, secIncidentPojo) => {
            delete secIncidentPojo._id;
            return secIncidentPojo;
        },
        versionKey: false
    }
});

export const SecurityIncident = mongoose.model("SecurityIncident", securityIncidentSchema);