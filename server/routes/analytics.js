const express = require('express');
const db = require('../config/database');
const { getTrafficData } = require('../utils/trafficData');

const router = express.Router();

// Get real-time traffic data
router.get('/traffic', async (req, res) => {
    try {
        // Get latest traffic data from database
        const result = await db.query(`
            SELECT DISTINCT ON (location_name) 
                location_name, latitude, longitude, congestion_level, recorded_at
            FROM traffic_data
            WHERE recorded_at > NOW() - INTERVAL '1 hour'
            ORDER BY location_name, recorded_at DESC
        `);

        // If no recent data, generate new data using Yandex Traffic API
        if (result.rows.length === 0) {
            const trafficData = await getTrafficData();
            
            // Store in database
            for (const data of trafficData) {
                await db.query(
                    `INSERT INTO traffic_data (location_name, latitude, longitude, congestion_level)
                     VALUES ($1, $2, $3, $4)`,
                    [data.location_name, data.latitude, data.longitude, data.congestion_level]
                );
            }
            
            res.json(trafficData);
        } else {
            res.json(result.rows);
        }

    } catch (error) {
        console.error('Get traffic data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get congestion index for the region
router.get('/congestion-index', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT AVG(congestion_level) as avg_congestion
            FROM traffic_data
            WHERE recorded_at > NOW() - INTERVAL '30 minutes'
        `);

        const congestionIndex = result.rows[0].avg_congestion || 5.0;

        res.json({
            congestionIndex: parseFloat(congestionIndex).toFixed(1),
            timestamp: new Date().toISOString(),
            status: congestionIndex > 8 ? 'Heavy' : congestionIndex > 6 ? 'Moderate' : 'Light'
        });

    } catch (error) {
        console.error('Get congestion index error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get analytics data for charts
router.get('/charts/issue-types', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                issue_type,
                COUNT(*) as count
            FROM reports
            GROUP BY issue_type
            ORDER BY count DESC
        `);

        const data = {
            labels: result.rows.map(row => row.issue_type.replace('_', ' ').toUpperCase()),
            values: result.rows.map(row => parseInt(row.count))
        };

        res.json(data);

    } catch (error) {
        console.error('Get issue types error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get weekly traffic trends
router.get('/charts/traffic-trends', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                DATE_TRUNC('day', recorded_at) as day,
                AVG(congestion_level) as avg_congestion
            FROM traffic_data
            WHERE recorded_at > NOW() - INTERVAL '7 days'
            GROUP BY day
            ORDER BY day
        `);

        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = {
            labels: result.rows.map(row => {
                const date = new Date(row.day);
                return days[date.getDay()];
            }),
            values: result.rows.map(row => parseFloat(row.avg_congestion).toFixed(1))
        };

        res.json(data);

    } catch (error) {
        console.error('Get traffic trends error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get regional statistics
router.get('/charts/regional-stats', async (req, res) => {
    try {
        // For MVP, we'll use districts of Tashkent
        const districts = ['Chilanzar', 'Yunusabad', 'Mirabad', 'Shaykhantaur', 'Yashnabad'];
        
        const data = {
            labels: districts,
            values: districts.map(() => Math.floor(Math.random() * 40) + 20) // Simulated for MVP
        };

        res.json(data);

    } catch (error) {
        console.error('Get regional stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get resolution time analysis
router.get('/charts/resolution-time', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT 
                CASE 
                    WHEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 < 24 THEN '< 24h'
                    WHEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 < 72 THEN '1-3 days'
                    WHEN EXTRACT(EPOCH FROM (resolved_at - created_at))/3600 < 168 THEN '3-7 days'
                    ELSE '> 1 week'
                END as time_range,
                COUNT(*) as count
            FROM reports
            WHERE resolved_at IS NOT NULL
            GROUP BY time_range
            ORDER BY 
                CASE time_range
                    WHEN '< 24h' THEN 1
                    WHEN '1-3 days' THEN 2
                    WHEN '3-7 days' THEN 3
                    ELSE 4
                END
        `);

        const data = {
            labels: result.rows.map(row => row.time_range),
            values: result.rows.map(row => parseInt(row.count))
        };

        res.json(data);

    } catch (error) {
        console.error('Get resolution time error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update analytics data (called periodically)
router.post('/update-daily-stats', async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const stats = await db.query(`
            SELECT 
                COUNT(*) as total_reports,
                COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved_reports,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_reports,
                AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))) as avg_resolution_seconds
            FROM reports
            WHERE DATE(created_at) = $1
        `, [today]);

        const { total_reports, resolved_reports, pending_reports, avg_resolution_seconds } = stats.rows[0];
        
        const avg_resolution_time = avg_resolution_seconds 
            ? `${Math.floor(avg_resolution_seconds / 3600)} hours` 
            : null;

        await db.query(`
            INSERT INTO analytics (date, total_reports, resolved_reports, pending_reports, avg_resolution_time)
            VALUES ($1, $2, $3, $4, $5::interval)
            ON CONFLICT (date) DO UPDATE SET
                total_reports = EXCLUDED.total_reports,
                resolved_reports = EXCLUDED.resolved_reports,
                pending_reports = EXCLUDED.pending_reports,
                avg_resolution_time = EXCLUDED.avg_resolution_time
        `, [today, total_reports, resolved_reports, pending_reports, avg_resolution_time]);

        res.json({ message: 'Analytics updated successfully' });

    } catch (error) {
        console.error('Update analytics error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;