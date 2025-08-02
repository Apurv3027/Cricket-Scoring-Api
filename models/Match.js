const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Match:
 *       type: object
 *       required:
 *         - team1
 *         - team2
 *         - matchType
 *         - overs
 *       properties:
 *         id:
 *           type: string
 *         team1:
 *           type: string
 *           description: First team ID
 *         team2:
 *           type: string
 *           description: Second team ID
 *         matchType:
 *           type: string
 *           enum: [T20, ODI, Test, T10]
 *         overs:
 *           type: number
 *         venue:
 *           type: string
 *         status:
 *           type: string
 *           enum: [scheduled, live, completed, abandoned]
 *         tossWinner:
 *           type: string
 *         tossDecision:
 *           type: string
 *           enum: [bat, bowl]
 *         currentInnings:
 *           type: number
 *         result:
 *           type: object
 */

const matchSchema = new mongoose.Schema({
    team1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    team2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    matchType: {
        type: String,
        enum: ['T20', 'ODI', 'Test', 'T10'],
        required: true
    },
    overs: {
        type: Number,
        required: true
    },
    venue: {
        type: String,
        trim: true
    },
    matchDate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['scheduled', 'live', 'completed', 'abandoned'],
        default: 'scheduled'
    },
    tossWinner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    tossDecision: {
        type: String,
        enum: ['bat', 'bowl']
    },
    currentInnings: {
        type: Number,
        default: 1,
        min: 1,
        max: 4
    },
    innings: [{
        battingTeam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        },
        bowlingTeam: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        overs: { type: Number, default: 0 },
        balls: { type: Number, default: 0 },
        extras: {
            wides: { type: Number, default: 0 },
            noBalls: { type: Number, default: 0 },
            byes: { type: Number, default: 0 },
            legByes: { type: Number, default: 0 }
        },
        isCompleted: { type: Boolean, default: false }
    }],
    result: {
        winner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Team'
        },
        resultType: {
            type: String,
            enum: ['runs', 'wickets', 'tie', 'no-result']
        },
        margin: String,
        manOfTheMatch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Player'
        }
    },
    commentary: [{
        over: Number,
        ball: Number,
        text: String,
        timestamp: { type: Date, default: Date.now }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Match', matchSchema);