const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Ball:
 *       type: object
 *       required:
 *         - match
 *         - innings
 *         - over
 *         - ball
 *         - bowler
 *         - batsman
 *       properties:
 *         match:
 *           type: string
 *         innings:
 *           type: number
 *         over:
 *           type: number
 *         ball:
 *           type: number
 *         bowler:
 *           type: string
 *         batsman:
 *           type: string
 *         runs:
 *           type: number
 *         isWide:
 *           type: boolean
 *         isNoBall:
 *           type: boolean
 *         isBye:
 *           type: boolean
 *         isLegBye:
 *           type: boolean
 *         isWicket:
 *           type: boolean
 *         wicketType:
 *           type: string
 */

const ballSchema = new mongoose.Schema({
    match: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Match',
        required: true
    },
    innings: {
        type: Number,
        required: true,
        min: 1,
        max: 4
    },
    over: {
        type: Number,
        required: true,
        min: 0
    },
    ball: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    bowler: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    batsman: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },
    nonStriker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    },
    runs: {
        type: Number,
        default: 0,
        min: 0,
        max: 6
    },
    isWide: {
        type: Boolean,
        default: false
    },
    isNoBall: {
        type: Boolean,
        default: false
    },
    isBye: {
        type: Boolean,
        default: false
    },
    isLegBye: {
        type: Boolean,
        default: false
    },
    isWicket: {
        type: Boolean,
        default: false
    },
    wicketType: {
        type: String,
        enum: ['bowled', 'caught', 'lbw', 'stumped', 'run-out', 'hit-wicket', 'obstructing', 'handled-ball', 'timed-out']
    },
    wicketTaker: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    },
    fielder: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    },
    commentary: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ball', ballSchema);