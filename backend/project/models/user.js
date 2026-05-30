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
    // What the user's ID must consist of
    userId: {
        type: Number,
        min: MIN_ID,
        max: Number.MAX_SAFE_INTEGER,
        index: true,
        required: true,
        unique: true
    },

    // What the user's username must consist of
    username: {
        type: String,
        trim: true,
        required: true,
        unique: true,
        minLength: [MIN_USERNAME_LENGTH, `Username can't be shorter than ${MIN_USERNAME_LENGTH} characters`],
        maxLength: [MAX_USERNAME_LENGTH, `Username can't be loger than ${MAX_USERNAME_LENGTH} characters`]
    },

    // Stored as "salt:hash" using scrypt, never plain text
    // select: false means it won't be returned in queries unless explicitly requested
    pwd: {
        type: String,
        required: true,
        trim: true,
        minLength: [MIN_PWD_LENGTH, `Password has to be at least ${MIN_PWD_LENGTH} characters long`],
        maxLength: [MAX_PWD_LENGTH, `I don't think you need a password that's longer than ${MAX_PWD_LENGTH} characters, Oh the boov`],
        select: false
    },

    // User's email
    email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        // validate taken from inclass code, IDG2100 Fullstack 2026
        validate: {
            validator: async function(email) {
                const existing = await this.constructor.findOne({ email });
                return !existing || existing.userId === this.userId; // changed User.exists to this.constructor.exists because user doesn't exist yet
            },
            message: "Email {VALUE} is aready in use"
        }
    },

    // User's age
    age: {
        type: Number,
        required: true,
        min: [MIN_AGE, `You must be at least ${MIN_AGE} years old to register`]
    },

    // what kind of user and what that type of user is allowed to do
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

    // User's current ELO rating
    eloRating: {
        type: Number,
        default: DEFAULT_ELO
    },

    // User's ELO rating from last week
    eloRatingLastWeek: {
        type: Number,
        default: DEFAULT_ELO
    },

    // Used for buy.ins and betting in games and tournaments
    // Players receive 100 points per week
    points: {
        type: Number,
        default: DEFAULT_POINTS,
        min: [0, "Points can't be negative"]
    },

    // References the user's top recent games 
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

    // Refers to the schema for the trophies, and embeds it as a sub-document in the user document
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

    // Stores the current valid refresh token
    // Replaced on every token refresh, invalidated on logout
    // select: false so it's never accidentally returned in responses
    refreshToken: {
        type: String,
        default: null,
        select: false
    },

    // Whether the user has veified their email
    // Users cannot play games until this is true
    emailVerified: {
        type: Boolean,
        default: false
    },

    // Token sent to the user's email for verification
    // Cleared after successful verification
    emailVerificationToken: {
        type: String,
        default: null,
        select: false
    },

    // When the verification token expires (15 min after being issued in this case)
    emailVerificationExpiry: {
        type: Date,
        default: null,
        select: false
    },

    // Is user banned? at default: no.
    isBanned: {
        type: Boolean,
        default: false
    }
},
{
    // Saves the timestamp for document creation, aka user creation
    timestamps: true,

    // code block copied and modified from inclass code, IDG2100 Fullstack 2026
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

// Function copied from inclass code, IDG2100 Fullstack 2026
// Checks if the userId is modified, new or not undefined, and generates a new one or leaves if be
// Re-hashes the password if it is changed 
userSchema.pre("validate", function() {
    if(this.isModified("userId") || this.isNew) { // isNew is for when there's a new user
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