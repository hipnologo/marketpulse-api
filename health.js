const express = require('express');
const os = require('os');
const router = express.Router();

router.get('/', (req, res) => {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    const cpuLoad = os.loadavg();

    const healthStats = {
        status: 'Market Pulse is running',
        uptime: `${Math.floor(uptime / 60)} minutes ${Math.floor(uptime % 60)} seconds`,
        memoryUsage: {
            rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
            heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
            heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
            external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
        },
        cpuLoad: {
            '1min': cpuLoad[0],
            '5min': cpuLoad[1],
            '15min': cpuLoad[2]
        }
    };

    res.json(healthStats);
});

module.exports = router;
