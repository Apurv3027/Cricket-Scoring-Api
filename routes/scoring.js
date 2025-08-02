const express = require('express');
const { body, validationResult } = require('express-validator');
const Match = require('../models/Match');
const Ball = require('../models/Ball');
const Player = require('../models/Player');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/scoring/ball:
 *   post:
 *     summary: Record a ball
 *     tags: [Scoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - match
 *               - bowler
 *               - batsman
 *               - runs
 *             properties:
 *               match:
 *                 type: string
 *               bowler:
 *                 type: string
 *               batsman:
 *                 type: string
 *               nonStriker:
 *                 type: string
 *               runs:
 *                 type: number
 *               isWide:
 *                 type: boolean
 *               isNoBall:
 *                 type: boolean
 *               isBye:
 *                 type: boolean
 *               isLegBye:
 *                 type: boolean
 *               isWicket:
 *                 type: boolean
 *               wicketType:
 *                 type: string
 *               fielder:
 *                 type: string
 *               commentary:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ball recorded successfully
 */
router.post('/ball', [auth, authorize('admin', 'scorer')], [
    body('match').notEmpty().withMessage('Match ID is required'),
    body('bowler').notEmpty().withMessage('Bowler is required'),
    body('batsman').notEmpty().withMessage('Batsman is required'),
    body('runs').isNumeric().withMessage('Runs must be a number')
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

        const match = await Match.findById(req.body.match);
        if (!match || match.status !== 'live') {
            return res.status(400).json({
                success: false,
                message: 'Match not found or not live'
            });
        }

        const currentInnings = match.innings[match.currentInnings - 1];
        if (!currentInnings || currentInnings.isCompleted) {
            return res.status(400).json({
                success: false,
                message: 'Current innings is completed'
            });
        }

        // Calculate over and ball number
        const totalBalls = currentInnings.balls + (req.body.isWide || req.body.isNoBall ? 0 : 1);
        const over = Math.floor(totalBalls / 6);
        const ball = (totalBalls % 6) + 1;

        // Create ball record
        const ballData = {
            ...req.body,
            innings: match.currentInnings,
            over,
            ball: ball === 7 ? 1 : ball // Reset to 1 if it's the 7th ball (new over)
        };

        if (ball === 7) {
            ballData.over = over + 1;
        }

        const ballRecord = new Ball(ballData);
        await ballRecord.save();

        // Update match innings
        let runsToAdd = req.body.runs;

        // Handle extras
        if (req.body.isWide) {
            currentInnings.extras.wides += 1;
            runsToAdd += 1;
        }
        if (req.body.isNoBall) {
            currentInnings.extras.noBalls += 1;
            runsToAdd += 1;
        }
        if (req.body.isBye) {
            currentInnings.extras.byes += req.body.runs;
        }
        if (req.body.isLegBye) {
            currentInnings.extras.legByes += req.body.runs;
        }

        currentInnings.runs += runsToAdd;

        if (req.body.isWicket) {
            currentInnings.wickets += 1;
        }

        // Update balls and overs only if not wide or no-ball
        if (!req.body.isWide && !req.body.isNoBall) {
            currentInnings.balls += 1;
            currentInnings.overs = Math.floor(currentInnings.balls / 6) +
                (currentInnings.balls % 6 > 0 ? (currentInnings.balls % 6) / 10 : 0);
        }

        // Check if innings is complete
        const maxOvers = match.overs;
        const oversCompleted = Math.floor(currentInnings.balls / 6);

        if (oversCompleted >= maxOvers || currentInnings.wickets >= 10) {
            currentInnings.isCompleted = true;

            // Check if match is complete or start second innings
            if (match.currentInnings === 1) {
                // Start second innings
                match.currentInnings = 2;
                const firstInnings = match.innings[0];
                match.innings.push({
                    battingTeam: firstInnings.bowlingTeam,
                    bowlingTeam: firstInnings.battingTeam,
                    runs: 0,
                    wickets: 0,
                    overs: 0,
                    balls: 0,
                    extras: { wides: 0, noBalls: 0, byes: 0, legByes: 0 },
                    isCompleted: false
                });
            } else {
                // Match completed
                match.status = 'completed';

                // Determine winner
                const firstInnings = match.innings[0];
                const secondInnings = match.innings[1];

                if (secondInnings.runs > firstInnings.runs) {
                    match.result.winner = secondInnings.battingTeam;
                    match.result.resultType = 'wickets';
                    match.result.margin = `${10 - secondInnings.wickets} wickets`;
                } else if (firstInnings.runs > secondInnings.runs) {
                    match.result.winner = firstInnings.battingTeam;
                    match.result.resultType = 'runs';
                    match.result.margin = `${firstInnings.runs - secondInnings.runs} runs`;
                } else {
                    match.result.resultType = 'tie';
                    match.result.margin = 'Match tied';
                }
            }
        }

        await match.save();

        await ballRecord.populate([
            { path: 'bowler', select: 'name' },
            { path: 'batsman', select: 'name' },
            { path: 'nonStriker', select: 'name' },
            { path: 'fielder', select: 'name' }
        ]);

        res.status(201).json({
            success: true,
            message: 'Ball recorded successfully',
            data: {
                ball: ballRecord,
                match: {
                    id: match._id,
                    status: match.status,
                    currentInnings: match.currentInnings,
                    innings: match.innings
                }
            }
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
 * /api/scoring/match/{id}/scorecard:
 *   get:
 *     summary: Get match scorecard
 *     tags: [Scoring]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Scorecard retrieved successfully
 */
router.get('/match/:id/scorecard', async (req, res) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('team1 team2', 'name shortName')
            .populate('result.winner', 'name shortName');

        if (!match) {
            return res.status(404).json({
                success: false,
                message: 'Match not found'
            });
        }

        // Get ball-by-ball data
        const balls = await Ball.find({ match: req.params.id })
            .populate('bowler batsman nonStriker fielder', 'name')
            .sort({ innings: 1, over: 1, ball: 1 });

        // Calculate batting and bowling stats
        const battingStats = {};
        const bowlingStats = {};

        balls.forEach(ball => {
            // Batting stats
            if (!battingStats[ball.batsman._id]) {
                battingStats[ball.batsman._id] = {
                    player: ball.batsman,
                    runs: 0,
                    balls: 0,
                    fours: 0,
                    sixes: 0,
                    isOut: false,
                    dismissal: null
                };
            }

            if (!ball.isBye && !ball.isLegBye) {
                battingStats[ball.batsman._id].runs += ball.runs;
            }

            if (!ball.isWide && !ball.isNoBall) {
                battingStats[ball.batsman._id].balls += 1;
            }

            if (ball.runs === 4) battingStats[ball.batsman._id].fours += 1;
            if (ball.runs === 6) battingStats[ball.batsman._id].sixes += 1;

            if (ball.isWicket) {
                battingStats[ball.batsman._id].isOut = true;
                battingStats[ball.batsman._id].dismissal = {
                    type: ball.wicketType,
                    bowler: ball.bowler.name,
                    fielder: ball.fielder?.name
                };
            }

            // Bowling stats
            if (!bowlingStats[ball.bowler._id]) {
                bowlingStats[ball.bowler._id] = {
                    player: ball.bowler,
                    overs: 0,
                    runs: 0,
                    wickets: 0,
                    maidens: 0,
                    wides: 0,
                    noBalls: 0
                };
            }

            bowlingStats[ball.bowler._id].runs += ball.runs;
            if (ball.isWide) bowlingStats[ball.bowler._id].wides += 1;
            if (ball.isNoBall) bowlingStats[ball.bowler._id].noBalls += 1;
            if (ball.isWicket) bowlingStats[ball.bowler._id].wickets += 1;
        });

        // Calculate bowling overs
        Object.values(bowlingStats).forEach(bowler => {
            const bowlerBalls = balls.filter(b =>
                b.bowler._id.toString() === bowler.player._id.toString() &&
                !b.isWide && !b.isNoBall
            ).length;
            bowler.overs = Math.floor(bowlerBalls / 6) + (bowlerBalls % 6) / 10;
        });

        res.json({
            success: true,
            data: {
                match,
                battingStats: Object.values(battingStats),
                bowlingStats: Object.values(bowlingStats),
                balls
            }
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
 * /api/scoring/live:
 *   get:
 *     summary: Get live matches
 *     tags: [Scoring]
 *     responses:
 *       200:
 *         description: Live matches retrieved successfully
 */
router.get('/live', async (req, res) => {
    try {
        const liveMatches = await Match.find({ status: 'live' })
            .populate('team1 team2', 'name shortName logo')
            .populate('result.winner', 'name shortName')
            .sort({ matchDate: -1 });

        res.json({
            success: true,
            data: { matches: liveMatches }
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