const express = require('express');
const { body, validationResult } = require('express-validator');
const Team = require('../models/Team');
const Player = require('../models/Player');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Get all teams
 *     tags: [Teams]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of teams per page
 *     responses:
 *       200:
 *         description: Teams retrieved successfully
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const teams = await Team.find({ isActive: true })
            .populate('captain', 'name role')
            .populate('players', 'name role')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Team.countDocuments({ isActive: true });

        res.json({
            success: true,
            data: {
                teams,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit)
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
 * /api/teams:
 *   post:
 *     summary: Create a new team
 *     tags: [Teams]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - shortName
 *             properties:
 *               name:
 *                 type: string
 *               shortName:
 *                 type: string
 *               logo:
 *                 type: string
 *               homeGround:
 *                 type: string
 *               coach:
 *                 type: string
 *     responses:
 *       201:
 *         description: Team created successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Access denied
 */
router.post('/', [auth, authorize('admin', 'scorer')], [
    body('name').notEmpty().withMessage('Team name is required'),
    body('shortName').isLength({ min: 3, max: 3 }).withMessage('Short name must be exactly 3 characters')
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

        const { name, shortName, logo, homeGround, coach } = req.body;

        // Check if team already exists
        const existingTeam = await Team.findOne({
            $or: [{ name }, { shortName: shortName.toUpperCase() }]
        });

        if (existingTeam) {
            return res.status(400).json({
                success: false,
                message: 'Team with this name or short name already exists'
            });
        }

        const team = new Team({
            name,
            shortName: shortName.toUpperCase(),
            logo,
            homeGround,
            coach
        });

        await team.save();

        res.status(201).json({
            success: true,
            message: 'Team created successfully',
            data: { team }
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
 * /api/teams/{id}:
 *   get:
 *     summary: Get team by ID
 *     tags: [Teams]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Team ID
 *     responses:
 *       200:
 *         description: Team retrieved successfully
 *       404:
 *         description: Team not found
 */
router.get('/:id', async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('captain', 'name role jerseyNumber')
            .populate('players', 'name role jerseyNumber battingStyle bowlingStyle');

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        res.json({
            success: true,
            data: { team }
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
 * /api/teams/{id}:
 *   put:
 *     summary: Update team
 *     tags: [Teams]
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
 *             $ref: '#/components/schemas/Team'
 *     responses:
 *       200:
 *         description: Team updated successfully
 *       404:
 *         description: Team not found
 */
router.put('/:id', [auth, authorize('admin', 'scorer')], async (req, res) => {
    try {
        const team = await Team.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        ).populate('captain players');

        if (!team) {
            return res.status(404).json({
                success: false,
                message: 'Team not found'
            });
        }

        res.json({
            success: true,
            message: 'Team updated successfully',
            data: { team }
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