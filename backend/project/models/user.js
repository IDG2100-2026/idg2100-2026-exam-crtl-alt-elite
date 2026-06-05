import mongoose from "mongoose";
import { hashPwd } from "../utils/hash.js";

import {
    MIN_USERNAME_LENGTH,
    MAX_USERNAME_LENGTH,
    MIN_PWD_LENGTH,
    MAX_PWD_LENGTH,
    MIN_AGE,
    DEFAULT_ELO,
    DEFAULT_POINTS,
    MIN_ID,
    RECENT_GAMES,
    MAX_LENGTH_ABOUT_ME
} from "../config/constants.js";

const userSchema = new mongoose.Schema({
    userId: {
        type: Number,
        min: MIN_ID,
        max: Number.MAX_SAFE_INTEGER,
        index: true,
        required: true,
        unique: true
    },

    username: {
        type: String,
        trim: true,
        required: true,
        unique: true,
        minLength: [MIN_USERNAME_LENGTH, `Username can't be shorter than ${MIN_USERNAME_LENGTH} characters`],
        maxLength: [MAX_USERNAME_LENGTH, `Username can't be loger than ${MAX_USERNAME_LENGTH} characters`]
    },

    pwd: {
        type: String,
        required: true,
        trim: true,
        minLength: [MIN_PWD_LENGTH, `Password has to be at least ${MIN_PWD_LENGTH} characters long`],
        maxLength: [MAX_PWD_LENGTH, `I don't think you need a password that's longer than ${MAX_PWD_LENGTH} characters, Oh the boov`],
        select: false
    },

    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: async function(email) {
                const existing = await this.constructor.findOne({ email });
                return !existing || existing.userId === this.userId;
            },
            message: "Email {VALUE} is aready in use"
        }
    },

    age: {
        type: Number,
        required: true,
        min: [MIN_AGE, `You must be at least ${MIN_AGE} years old to register`]
    },

    role: {
        type: String,
        enum: [
            "anonymous",
            "user",
            "admin"
        ],
        default: "user"
    },

    avatar: {
        type: String,
        default: null
    },

    aboutMe: {
        type: String,
        trim: true,
        maxLength: [MAX_LENGTH_ABOUT_ME, `About me can't be longer than ${MAX_LENGTH_ABOUT_ME} characters`],
        default: ""
    },

    eloRating: {
        type: Number,
        default: DEFAULT_ELO
    },

    eloRatingLastWeek: {
        type: Number,
        default: DEFAULT_ELO
    },

    points: {
        type: Number,
        default: DEFAULT_POINTS,
        min: [0, "Points can't be negative"]
    },

    recentGames: {
        type: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Game"
        }],
        validate: {
            validator: (arr) => arr.length <= RECENT_GAMES,
            message: `recentGames can hold a maximum of ${RECENT_GAMES} entries`
        }
    },

    trophies: [{
        trophyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Trophy"
        },
        awardedAt: {
            type: Date,
            default: Date.now
        }
    }],

    refreshToken: {
        type: String,
        default: null,
        select: false
    },

    emailVerified: {
        type: Boolean,
        default: false
    },

    emailVerificationToken: {
        type: String,
        default: null,
        select: false
    },

    emailVerificationExpiry: {
        type: Date,
        default: null,
        select: false
    },

    isBanned: {
        type: Boolean,
        default: false
    }
},
{
    timestamps: true,
    toJSON: {
        transform: (userDoc, userPojo) => {
            delete userPojo._id;
            delete userPojo.pwd;
            delete userPojo.refreshToken;
            delete userPojo.emailVerificationToken;
            delete userPojo.emailVerificationExpiry;
            return userPojo;
        },
        versionKey: false
    }
});

userSchema.pre("validate", function() {
    if(this.isModified("userId") || this.isNew) {
        if(this.userId !== undefined) {
            console.warn("User IDs are supposed to be auto generated. Discarding the past value", this.userId, ".");
        }
        this.userId = Math.round(Math.random() * Number.MAX_SAFE_INTEGER);
    }

    if(this.isModified("pwd")) {
        this.pwd = hashPwd(this.pwd);
    }
});

export const User = mongoose.model("User", userSchema);
