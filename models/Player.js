const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Player:
 *       type: object
 *       required:
 *         - name
 *         - team
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         team:
 *           type: string
 *           description: Team ID
 *         role:
 *           type: string
 *           enum: [batsman, bowler, allrounder, wicketkeeper]
 *         battingStyle:
 *           type: string
 *           enum: [right-handed, left-handed]
 *         bowlingStyle:
 *           type: string
 *         jerseyNumber:
 *           type: number
 *         stats:
 *           type: object
 */

const playerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    team: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team',
        required: true
    },
    role: {
        type: String,
        enum: ['batsman', 'bowler', 'allrounder', 'wicketkeeper'],
        required: true
    },
    battingStyle: {
        type: String,
        enum: ['right-handed', 'left-handed'],
        default: 'right-handed'
    },
    bowlingStyle: {
        type: String,
        enum: ['right-arm-fast', 'left-arm-fast', 'right-arm-medium', 'left-arm-medium',
            'right-arm-spin', 'left-arm-spin', 'leg-spin', 'off-spin']
    },
    jerseyNumber: {
        type: Number,
        min: 1,
        max: 999
    },
    dateOfBirth: {
        type: Date
    },
    nationality: {
        type: String,
        trim: true
    },
    stats: {
        matches: { type: Number, default: 0 },
        runs: { type: Number, default: 0 },
        wickets: { type: Number, default: 0 },
        catches: { type: Number, default: 0 },
        stumpings: { type: Number, default: 0 },
        highestScore: { type: Number, default: 0 },
        bestBowling: {
            wickets: { type: Number, default: 0 },
            runs: { type: Number, default: 0 }
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Player', playerSchema);