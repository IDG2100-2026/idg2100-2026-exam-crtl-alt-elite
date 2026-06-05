import mongoose from "mongoose";

const securityIncidentSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ["rate_limit", "ip_mismatch"],
        required: true
    },

    userId: {
        type: Number,
        default: null
    },

    ip: {
        type: String,
        required: true
    },

    userAgent: {
        type: String,
        default: null
    },

    detail: {
        type: String,
        default: null
    }
},
{
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
