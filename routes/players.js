const express = require('express');
const { body, validationResult } = require('express-validator');
const Player = require('../models/Player');
const Team = require('../models/Team');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/players:
 *   get:
 *     summary: Get all players
 *     tags: [Players]
 *     parameters:
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: Filter by team ID
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *         description: Filter by player role
 *     responses:
 *       200:
 *         description: Players retrieved successfully
 */
router.get('/', async (req, res) => {
    try {
        let query = { isActive: true };

        if (req.query.team) {
            query.team = req.query.team;
        }

        if (req.query.role) {
            query.role = req.query.role;
        }

        const players = await Player.find(query)
            .populate('team', 'name shortName')
            .sort({ name: 1 });

        res.json({
            success: true,
            data: { players }
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
 * /api/players:
 *   post:
 *     summary: Create a new player
 *     tags: [Players]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Player'
 *     responses:
 *       201:
 *         description: Player created successfully
 */
router.post('/', [auth, authorize('admin', 'scorer')], [
    body('name').notEmpty().withMessage('Player name is required'),
    body('team').notEmpty().withMessage('Team is required'),
    body('role').isIn(['batsman', 'bowler', 'allrounder', 'wicketkeeper']).withMessage('Invalid role')
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

        // Check if team exists
        const team = await Team.findById(req.body.team);
        if (!team) {
            return res.status(400).json({
                success: false,
                message: 'Team not found'
            });
        }

        const player = new Player(req.body);
        await player.save();

        // Add player to team
        await Team.findByIdAndUpdate(
            req.body.team,
            { $push: { players: player._id } }
        );

        await player.populate('team', 'name shortName');

        res.status(201).json({
            success: true,
            message: 'Player created successfully',
            data: { player }
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
 * /api/players/{id}:
 *   get:
 *     summary: Get player by ID
 *     tags: [Players]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Player retrieved successfully
 *       404:
 *         description: Player not found
 */
router.get('/:id', async (req, res) => {
    try {
        const player = await Player.findById(req.params.id)
            .populate('team', 'name shortName logo');

        if (!player) {
            return res.status(404).json({
                success: false,
                message: 'Player not found'
            });
        }

        res.json({
            success: true,
            data: { player }
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