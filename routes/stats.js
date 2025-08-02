const express = require('express');
const Match = require('../models/Match');
const Ball = require('../models/Ball');
const Player = require('../models/Player');
const Team = require('../models/Team');

const router = express.Router();

/**
 * @swagger
 * /api/stats/player/{id}:
 *   get:
 *     summary: Get player statistics
 *     tags: [Statistics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player stats retrieved successfully
 */
router.get('/player/:id', async (req, res) => {
    try {
        const player = await Player.findById(req.params.id).populate('team', 'name shortName');

        if (!player) {
            return res.status(404).json({
                success: false,
                message: 'Player not found'
            });
        }

        // Get all balls for this player
        const battingBalls = await Ball.find({ batsman: req.params.id });
        const bowlingBalls = await Ball.find({ bowler: req.params.id });

        // Calculate batting stats
        const battingStats = {
            matches: [...new Set(battingBalls.map(b => b.match.toString()))].length,
            runs: battingBalls.filter(b => !b.isBye && !b.isLegBye).reduce((sum, b) => sum + b.runs, 0),
            balls: battingBalls.filter(b => !b.isWide && !b.isNoBall).length,
            fours: battingBalls.filter(b => b.runs === 4).length,
            sixes: battingBalls.filter(b => b.runs === 6).length,
            dismissals: battingBalls.filter(b => b.isWicket).length,
            highestScore: 0,
            strikeRate: 0,
            average: 0
        };

        // Calculate strike rate and average
        if (battingStats.balls > 0) {
            battingStats.strikeRate = (battingStats.runs / battingStats.balls * 100).toFixed(2);
        }
        if (battingStats.dismissals > 0) {
            battingStats.average = (battingStats.runs / battingStats.dismissals).toFixed(2);
        }

        // Calculate bowling stats
        const bowlingStats = {
            matches: [...new Set(bowlingBalls.map(b => b.match.toString()))].length,
            wickets: bowlingBalls.filter(b => b.isWicket).length,
            runs: bowlingBalls.reduce((sum, b) => sum + b.runs, 0),
            balls: bowlingBalls.filter(b => !b.isWide && !b.isNoBall).length,
            economy: 0,
            average: 0,
            bestBowling: { wickets: 0, runs: 0 }
        };

        // Calculate economy and average
        if (bowlingStats.balls > 0) {
            bowlingStats.economy = (bowlingStats.runs / (bowlingStats.balls / 6)).toFixed(2);
        }
        if (bowlingStats.wickets > 0) {
            bowlingStats.average = (bowlingStats.runs / bowlingStats.wickets).toFixed(2);
        }

        res.json({
            success: true,
            data: {
                player,
                batting: battingStats,
                bowling: bowlingStats
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
 * /api/stats/team/{id}:
 *   get:
 *     summary: Get team statistics
 *     tags: [Statistics]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Team stats retrieved successfully
 */
router.get('/team/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id).populate('players', 'name role');

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        // Get all matches for this team
        const matches = await Match.find({
            $or: [{ team1: req.params.id }, { team2: req.params.id }],
            status: 'completed'
        }).populate('team1 team2 result.winner', 'name shortName');

        const stats = {
            matchesPlayed: matches.length,
            matchesWon: matches.filter(m => m.result.winner?.toString() === req.params.id).length,
            matchesLost: 0,
            winPercentage: 0,
            totalRuns: 0,
            totalWickets: 0,
            highestScore: 0,
            lowestScore: 999
        };

        stats.matchesLost = stats.matchesPlayed - stats.matchesWon;
        stats.winPercentage = stats.matchesPlayed > 0 ?
            ((stats.matchesWon / stats.matchesPlayed) * 100).toFixed(2) : 0;

        // Calculate batting stats from innings
        matches.forEach(match => {
            match.innings.forEach(innings => {
                if (innings.battingTeam.toString() === req.params.id) {
                    stats.totalRuns += innings.runs;
                    if (innings.runs > stats.highestScore) stats.highestScore = innings.runs;
                    if (innings.runs < stats.lowestScore) stats.lowestScore = innings.runs;
                }
                if (innings.bowlingTeam.toString() === req.params.id) {
                    stats.totalWickets += innings.wickets;
                }
            });
        });

        if (stats.matchesPlayed === 0) {
            stats.lowestScore = 0;
        }

        res.json({
            success: true,
            data: {
                team,
                stats
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
 * /api/stats/leaderboard:
 *   get:
 *     summary: Get leaderboard statistics
 *     tags: [Statistics]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [runs, wickets, sixes, fours]
 *         description: Type of leaderboard
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of results
 *     responses:
 *       200:
 *         description: Leaderboard retrieved successfully
 */
router.get('/leaderboard', async (req, res) => {
    try {
        const { type = 'runs', limit = 10 } = req.query;
        const limitNum = parseInt(limit);

        let pipeline = [];

        switch (type) {
            case 'runs':
                pipeline = [
                    {
                        $match: {
                            isBye: false,
                            isLegBye: false
                        }
                    },
                    {
                        $group: {
                            _id: '$batsman',
                            totalRuns: { $sum: '$runs' },
                            matches: { $addToSet: '$match' },
                            balls: {
                                $sum: {
                                    $cond: [
                                        { $and: [{ $eq: ['$isWide', false] }, { $eq: ['$isNoBall', false] }] },
                                        1,
                                        0
                                    ]
                                }
                            },
                            fours: {
                                $sum: {
                                    $cond: [{ $eq: ['$runs', 4] }, 1, 0]
                                }
                            },
                            sixes: {
                                $sum: {
                                    $cond: [{ $eq: ['$runs', 6] }, 1, 0]
                                }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'players',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'player'
                        }
                    },
                    {
                        $unwind: '$player'
                    },
                    {
                        $lookup: {
                            from: 'teams',
                            localField: 'player.team',
                            foreignField: '_id',
                            as: 'team'
                        }
                    },
                    {
                        $unwind: '$team'
                    },
                    {
                        $addFields: {
                            matchesPlayed: { $size: '$matches' },
                            strikeRate: {
                                $cond: [
                                    { $gt: ['$balls', 0] },
                                    { $multiply: [{ $divide: ['$totalRuns', '$balls'] }, 100] },
                                    0
                                ]
                            }
                        }
                    },
                    {
                        $sort: { totalRuns: -1 }
                    },
                    {
                        $limit: limitNum
                    },
                    {
                        $project: {
                            player: {
                                name: '$player.name',
                                role: '$player.role'
                            },
                            team: {
                                name: '$team.name',
                                shortName: '$team.shortName'
                            },
                            totalRuns: 1,
                            matchesPlayed: 1,
                            balls: 1,
                            fours: 1,
                            sixes: 1,
                            strikeRate: { $round: ['$strikeRate', 2] }
                        }
                    }
                ];
                break;

            case 'wickets':
                pipeline = [
                    {
                        $match: {
                            isWicket: true
                        }
                    },
                    {
                        $group: {
                            _id: '$bowler',
                            totalWickets: { $sum: 1 },
                            matches: { $addToSet: '$match' },
                            runs: { $sum: '$runs' },
                            balls: {
                                $sum: {
                                    $cond: [
                                        { $and: [{ $eq: ['$isWide', false] }, { $eq: ['$isNoBall', false] }] },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'players',
                            localField: '_id',
                            foreignField: '_id',
                            as: 'player'
                        }
                    },
                    {
                        $unwind: '$player'
                    },
                    {
                        $lookup: {
                            from: 'teams',
                            localField: 'player.team',
                            foreignField: '_id',
                            as: 'team'
                        }
                    },
                    {
                        $unwind: '$team'
                    },
                    {
                        $addFields: {
                            matchesPlayed: { $size: '$matches' },
                            economy: {
                                $cond: [
                                    { $gt: ['$balls', 0] },
                                    { $divide: ['$runs', { $divide: ['$balls', 6] }] },
                                    0
                                ]
                            },
                            average: {
                                $cond: [
                                    { $gt: ['$totalWickets', 0] },
                                    { $divide: ['$runs', '$totalWickets'] },
                                    0
                                ]
                            }
                        }
                    },
                    {
                        $sort: { totalWickets: -1 }
                    },
                    {
                        $limit: limitNum
                    },
                    {
                        $project: {
                            player: {
                                name: '$player.name',
                                role: '$player.role'
                            },
                            team: {
                                name: '$team.name',
                                shortName: '$team.shortName'
                            },
                            totalWickets: 1,
                            matchesPlayed: 1,
                            runs: 1,
                            economy: { $round: ['$economy', 2] },
                            average: { $round: ['$average', 2] }
                        }
                    }
                ];
                break;

            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid leaderboard type'
                });
        }

        const results = await Ball.aggregate(pipeline);

        res.json({
            success: true,
            data: {
                type,
                results
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

module.exports = router;