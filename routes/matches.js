const express = require('express');
const { body, validationResult } = require('express-validator');
const Match = require('../models/Match');
const Team = require('../models/Team');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/matches:
 *   get:
 *     summary: Get all matches
 *     tags: [Matches]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by match status
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: Filter by team ID
 *     responses:
 *       200:
 *         description: Matches retrieved successfully
 */
router.get('/', async (req, res) => {
    try {
        let query = {};

        if (req.query.status) {
            query.status = req.query.status;
        }

        if (req.query.team) {
            query.$or = [
                { team1: req.query.team },
                { team2: req.query.team }
            ];
        }

        const matches = await Match.find(query)
            .populate('team1', 'name shortName logo')
            .populate('team2', 'name shortName logo')
            .populate('tossWinner', 'name shortName')
            .populate('result.winner', 'name shortName')
            .populate('result.manOfTheMatch', 'name')
            .sort({ matchDate: -1 });

        res.json({
            success: true,
            data: { matches }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/matches:
 *   post:
 *     summary: Create a new match
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - team1
 *               - team2
 *               - matchType
 *               - overs
 *             properties:
 *               team1:
 *                 type: string
 *               team2:
 *                 type: string
 *               matchType:
 *                 type: string
 *                 enum: [T20, ODI, Test, T10]
 *               overs:
 *                 type: number
 *               venue:
 *                 type: string
 *               matchDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Match created successfully
 */
router.post('/', [auth, authorize('admin', 'scorer')], [
    body('team1').notEmpty().withMessage('Team 1 is required'),
    body('team2').notEmpty().withMessage('Team 2 is required'),
    body('matchType').isIn(['T20', 'ODI', 'Test', 'T10']).withMessage('Invalid match type'),
    body('overs').isNumeric().withMessage('Overs must be a number')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { team1, team2 } = req.body;

        if (team1 === team2) {
            return res.status(400).json({
                success: false,
                message: 'Teams cannot be the same'
            });
        }

        // Verify teams exist
        const [teamOne, teamTwo] = await Promise.all([
            Team.findById(team1),
            Team.findById(team2)
        ]);

        if (!teamOne || !teamTwo) {
            return res.status(400).json({
                success: false,
                message: 'One or both teams not found'
            });
        }

        const match = new Match(req.body);
        await match.save();

        await match.populate([
            { path: 'team1', select: 'name shortName logo' },
            { path: 'team2', select: 'name shortName logo' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Match created successfully',
            data: { match }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/matches/{id}:
 *   get:
 *     summary: Get match by ID
 *     tags: [Matches]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Match retrieved successfully
 *       404:
 *         description: Match not found
 */
router.get('/:id', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('team1', 'name shortName logo')
            .populate('team2', 'name shortName logo')
            .populate('tossWinner', 'name shortName')
            .populate('result.winner', 'name shortName')
            .populate('result.manOfTheMatch', 'name team');

        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        res.json({
            success: true,
            data: { match }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

/**
 * @swagger
 * /api/matches/{id}/start:
 *   patch:
 *     summary: Start a match
 *     tags: [Matches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tossWinner
 *               - tossDecision
 *             properties:
 *               tossWinner:
 *                 type: string
 *               tossDecision:
 *                 type: string
 *                 enum: [bat, bowl]
 *     responses:
 *       200:
 *         description: Match started successfully
 */
router.patch('/:id/start', [auth, authorize('admin', 'scorer')], async (req, res) => {
    try {
        const { tossWinner, tossDecision } = req.body;

        const match = await Match.findById(req.params.id);
        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        if (match.status !== 'scheduled') {
            return res.status(400).json({
                success: false,
                message: 'Match cannot be started'
            });
        }

        // Initialize first innings
        const battingTeam = tossDecision === 'bat' ? tossWinner :
            (tossWinner.toString() === match.team1.toString() ? match.team2 : match.team1);
        const bowlingTeam = tossDecision === 'bowl' ? tossWinner :
            (tossWinner.toString() === match.team1.toString() ? match.team2 : match.team1);

        match.status = 'live';
        match.tossWinner = tossWinner;
        match.tossDecision = tossDecision;
        match.innings = [{
            battingTeam,
            bowlingTeam,
            runs: 0,
            wickets: 0,
            overs: 0,
            balls: 0,
            extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
            isCompleted: false
        }];

        await match.save();
        await match.populate([
            { path: 'team1', select: 'name shortName' },
            { path: 'team2', select: 'name shortName' },
            { path: 'tossWinner', select: 'name shortName' }
        ]);

        res.json({
            success: true,
            message: 'Match started successfully',
            data: { match }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});

module.exports = router;