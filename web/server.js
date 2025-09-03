const config = require('./vue/dist/UIconfig');

const Koa = require('koa');
const serve = require('koa-static');
const cors = require('@koa/cors');
const _ = require('lodash');
const bodyParser = require('koa-bodyparser');

const opn = require('opn');
const server = require('http').createServer();
const router = require('koa-router')();
const ws = require('ws');
const app = new Koa(); // Use new keyword here

const WebSocketServer = require('ws').Server;
const wss = new WebSocketServer({ server: server });

const cache = require('./state/cache');

const nodeCommand = _.last(process.argv[1].split('/'));
const isDevServer = nodeCommand === 'server' || nodeCommand === 'server.js';

wss.on('connection', ws => {
  ws.isAlive = true;
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  ws.ping(_.noop);
  ws.on('error', e => {
    console.error(new Date, '[WS] connection error:', e);
  });
});

setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) {
      console.log(new Date, '[WS] stale websocket client, terminating..');
      return ws.terminate();
    }

    ws.isAlive = false;
    ws.ping(_.noop);
  });
}, 10 * 1000);

// broadcast function
const broadcast = data => {
  if (_.isEmpty(data)) {
    return;
  }

  const payload = JSON.stringify(data);

  wss.clients.forEach(ws => {
    ws.send(payload, err => {
      if (err) {
        console.log(new Date, '[WS] unable to send data to client:', err);
      }
    });
  });
}
cache.set('broadcast', broadcast);

const ListManager = require('./state/listManager');
const GekkoManager = require('./state/gekkoManager');

// initialize lists and dump into cache
cache.set('imports', new ListManager);
cache.set('gekkos', new GekkoManager);
cache.set('apiKeyManager', require('./apiKeyManager'));

// setup API routes

const WEBROOT = __dirname + '/';
const ROUTE = n => WEBROOT + 'routes/' + n;

// attach routes
const apiKeys = require(ROUTE('apiKeys'));
router.get('/api/info', require(ROUTE('info')));
router.get('/api/strategies', require(ROUTE('strategies')));
router.get('/api/configPart/:part', require(ROUTE('configPart')));
router.get('/api/apiKeys', apiKeys.get);

const listWrapper = require(ROUTE('list'));
router.get('/api/imports', listWrapper('imports'));
router.get('/api/gekkos', listWrapper('gekkos'));
router.get('/api/exchanges', require(ROUTE('exchanges')));

router.post('/api/addApiKey', apiKeys.add);
router.post('/api/removeApiKey', apiKeys.remove);
router.post('/api/scan', require(ROUTE('scanDateRange')));
router.post('/api/scansets', require(ROUTE('scanDatasets')));
router.post('/api/backtest', require(ROUTE('backtest')));
router.post('/api/import', require(ROUTE('import')));
const trainRoutes = require(ROUTE('train'));
router.post('/api/train', trainRoutes.train);
router.get('/api/models', trainRoutes.list);
router.delete('/api/models/:name', trainRoutes.remove);
router.post('/api/startGekko', require(ROUTE('startGekko')));
router.post('/api/stopGekko', require(ROUTE('stopGekko')));
router.post('/api/deleteGekko', require(ROUTE('deleteGekko')));
router.post('/api/getCandles', require(ROUTE('getCandles')));

app
  .use(cors())
  .use(serve(WEBROOT + 'vue/dist'))
  .use(bodyParser())
  .use(require('koa-logger')())
  .use(router.routes())
  .use(router.allowedMethods());

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const isWindows = os.platform() === 'win32';

const finrlDir = path.join(__dirname, '../external/finrl_api');
const finrlSubmodulePath = path.join(finrlDir, 'finrl_mod');
const condaBase = path.join(__dirname, '../external/miniconda3');
const condaEnvName = 'finrl_env';

const pythonPath = isWindows
  ? path.join(condaBase, 'envs', condaEnvName, 'python.exe')
  : path.join(condaBase, 'envs', condaEnvName, 'bin', 'python');

if (!fs.existsSync(finrlSubmodulePath)) {
  console.error('[ERROR] FinRL submodule (finrl_mod) not found.');
  console.error('Did you run: git submodule update --init --recursive ?');
  process.exit(1);
}

if (!fs.existsSync(pythonPath)) {
  console.error('[ERROR] Python virtual environment not found.');
  console.error('Did you run setup_rl.sh or setup_rl.bat?');
  process.exit(1);
}

console.log('[INFO] Starting FinRL API...');

const rlProcess = spawn(pythonPath, ['app.py'], {
  cwd: finrlDir,
  stdio: 'inherit'
});

rlProcess.on('exit', code => {
  console.log(`[INFO] FinRL API exited with code ${code}`);
});

process.on('SIGINT', () => {
  console.log('\n[INFO] Shutting down FinRL API...');
  rlProcess.kill('SIGINT');
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('\n[INFO] SIGTERM received. Terminating FinRL API...');
  rlProcess.kill('SIGTERM');
  process.exit();
});

server.timeout = config.api.timeout || 60 * 60 * 1000;
server.on('request', app.callback());
server.listen(config.api.port, config.api.host, '::', () => {
  const host = `${config.ui.host}:${config.ui.port}${config.ui.path}`;

  let location;
  if (config.ui.ssl) {
    location = `https://${host}`;
  } else {
    location = `http://${host}`;
  }

  console.log('Serving Gekko UI on ' + location + '\n');

  // only open a browser when running `node gekko`
  // this prevents opening the browser during development
  if (!isDevServer && !config.headless) {
    opn(location)
      .catch(err => {
        console.log('Something went wrong when trying to open your web browser. UI is running on ' + location + '.');
      });
  }
});
