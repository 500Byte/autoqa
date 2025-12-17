const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// When in Electron production, the app is running from the resources/app folder.
// The .next folder should be relative to this file if bundle is correct.
const dir = path.join(__dirname);

const app = next({
    dev, hostname, port, dir, conf: {
        // Force production settings if needed, but 'dev' flag usually handles it
    }
});

const handle = app.getRequestHandler();

function startServer() {
    return app.prepare().then(() => {
        createServer(async (req, res) => {
            try {
                const parsedUrl = parse(req.url, true);
                const { pathname, query } = parsedUrl;
                await handle(req, res, parsedUrl);
            } catch (err) {
                console.error('Error occurred handling', req.url, err);
                res.statusCode = 500;
                res.end('internal server error');
            }
        })
            .once('error', (err) => {
                console.error(err);
                process.exit(1);
            })
            .listen(port, () => {
                console.log(`> Ready on http://${hostname}:${port}`);
            });
    });
}

module.exports = { startServer };
