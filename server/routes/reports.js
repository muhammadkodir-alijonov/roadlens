const express = require('express');
const Joi = require('joi');
const db = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Validation schemas
const reportSchema = Joi.object({
    issue_type: Joi.string().required().valid('pothole', 'traffic_light', 'obstruction', 'signage', 'other'),
    description: Joi.string().required().min(10).max(1000),
    severity: Joi.string().required().valid('low', 'medium', 'high', 'critical'),
    latitude: Joi.number().required().min(-90).max(90),
    longitude: Joi.number().required().min(-180).max(180),
    address: Joi.string().optional().max(500),
    reporter_name: Joi.string().optional().max(100),
    reporter_contact: Joi.string().optional().email()
});

// Get all reports with filters
router.get('/', async (req, res) => {
    try {
        const { status, severity, issue_type, limit = 50, offset = 0 } = req.query;
        
        let query = 'SELECT * FROM reports WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (status) {
            query += ` AND status = $${++paramCount}`;
            params.push(status);
        }
        if (severity) {
            query += ` AND severity = $${++paramCount}`;
            params.push(severity);
        }
        if (issue_type) {
            query += ` AND issue_type = $${++paramCount}`;
            params.push(issue_type);
        }

        query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        
        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) FROM reports WHERE 1=1';
        const countParams = [];
        paramCount = 0;

        if (status) {
            countQuery += ` AND status = $${++paramCount}`;
            countParams.push(status);
        }
        if (severity) {
            countQuery += ` AND severity = $${++paramCount}`;
            countParams.push(severity);
        }
        if (issue_type) {
            countQuery += ` AND issue_type = $${++paramCount}`;
            countParams.push(issue_type);
        }

        const countResult = await db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);

        res.json({
            reports: result.rows,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(totalCount / limit)
            }
        });

    } catch (error) {
        console.error('Get reports error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single report
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM reports WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Get report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create new report
router.post('/', async (req, res) => {
    try {
        const { error, value } = reportSchema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }

        const {
            issue_type,
            description,
            severity,
            latitude,
            longitude,
            address,
            reporter_name,
            reporter_contact
        } = value;

        const result = await db.query(
            `INSERT INTO reports (issue_type, description, severity, latitude, longitude, address, reporter_name, reporter_contact)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [issue_type, description, severity, latitude, longitude, address, reporter_name, reporter_contact]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Create report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update report (admin only)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assigned_to } = req.body;

        // Check if report exists
        const checkResult = await db.query('SELECT * FROM reports WHERE id = $1', [id]);
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        let updateQuery = 'UPDATE reports SET updated_at = CURRENT_TIMESTAMP';
        const params = [];
        let paramCount = 0;

        if (status) {
            updateQuery += `, status = $${++paramCount}`;
            params.push(status);
            
            if (status === 'resolved') {
                updateQuery += ', resolved_at = CURRENT_TIMESTAMP';
            }
        }

        if (assigned_to !== undefined) {
            updateQuery += `, assigned_to = $${++paramCount}`;
            params.push(assigned_to);
        }

        updateQuery += ` WHERE id = $${++paramCount} RETURNING *`;
        params.push(id);

        const result = await db.query(updateQuery, params);
        res.json(result.rows[0]);

    } catch (error) {
        console.error('Update report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete report (admin only)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await db.query('DELETE FROM reports WHERE id = $1 RETURNING id', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Report not found' });
        }

        res.json({ message: 'Report deleted successfully', id: result.rows[0].id });

    } catch (error) {
        console.error('Delete report error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get reports statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved,
                COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as today,
                COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical
            FROM reports
        `);

        const byType = await db.query(`
            SELECT issue_type, COUNT(*) as count
            FROM reports
            GROUP BY issue_type
            ORDER BY count DESC
        `);

        res.json({
            summary: stats.rows[0],
            byType: byType.rows
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;