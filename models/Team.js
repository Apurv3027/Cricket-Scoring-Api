const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     Team:
 *       type: object
 *       required:
 *         - name
 *         - shortName
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *           description: Full team name
 *         shortName:
 *           type: string
 *           description: Team abbreviation (3 chars)
 *         logo:
 *           type: string
 *           description: Team logo URL
 *         captain:
 *           type: string
 *           description: Player ID of captain
 *         players:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of player IDs
 *         matchesPlayed:
 *           type: number
 *         matchesWon:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    shortName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 3,
        uppercase: true
    },
    logo: {
        type: String,
        default: ''
    },
    captain: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player'
    }],
    homeGround: {
        type: String,
        trim: true
    },
    coach: {
        type: String,
        trim: true
    },
    founded: {
        type: Date
    },
    matchesPlayed: {
        type: Number,
        default: 0
    },
    matchesWon: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Team', teamSchema);