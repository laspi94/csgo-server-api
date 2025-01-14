import cors from 'cors';
import express from 'express';
import bodyParser from "body-parser";
import timeout from 'connect-timeout';
import {haltOnTimedout, response, error} from './helpers';
import Server from './Server';
import * as Sentry from '@sentry/node';

const fs = require('fs').promises;

Sentry.init({dsn: process.env.SENTRY_DSN});

const app = express();

/***********************
 *    CONFIGURATION    *
 ***********************/

app.use(timeout(30000));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(cors());
app.use(haltOnTimedout);

/*******************
 *    CONSTANTS    *
 *******************/
const HTTP_PORT = process.env.HTTP_PORT || 27300;

/*******************
 *    VARIABLES    *
 *******************/
// Server data
let servers = {};
let tokens = [];

// TODO: update with foreach
function getServer(address, port) {
    if (port) {
        address = `${address}:${port}`;
    }

    return servers[address];
}

function log(...message) {
    let now = (new Date).toISOString();

    console.log(`[${now}] ${message.join(' ')}`);
}

function sleep(delay) {
    return new Promise((res, rej) => {
        setTimeout(res, delay);
    });
}

async function readServers() {
    let rawServers = await fs.readFile('./config/servers.json');
    let svs = JSON.parse(rawServers.toString());

    tokens = [
        ...tokens,
        ...svs['tokens']
    ];

    for (let {hostname, name, ip, port, password, receiverPort} of svs['servers']) {
        let sv = new Server(hostname, name, ip, parseInt(port), password, receiverPort);
        let address = `${ip}:${port}`;

        servers[address] = sv;
        sv.connect();
    }
}

function validateToken(req, res) {
    let token = req.query.token;

    if (tokens.indexOf(token) === -1) {
        log(`${token}: Invalid token`);
        res.send(error('Invalid token'));
        return false;
    }

    return true;
}

/**********************
 *    STATIC CALLS    *
 **********************/

readServers()
    .catch(err => console.log(err));

/***************
 *    PAGES    *
 ***************/

app.get('/send', async (req, res) => {
    if (!validateToken(req, res)) return;

    let {ip, port, command, delay, token, wait} = req.query;

    delay = parseInt(delay);

    if (isNaN(delay)) {
        delay = 0;
    }

    let server = getServer(ip, parseInt(port));

    if (!server) {
        res.send(error('Server could not be found!'));
    }

    log(`${token}: ${ip}:${port} @ ${delay}ms $ ${command}`);

    if (!wait) {
        res.send(response(true));
    }

    await sleep(delay);

    const reply = await server.execute(command);

    if (!reply) {
        res.send(error('Null response'));

        return;
    }

    if (wait) {
        res.send(response(reply.response));
    }
});

app.get('/list', (req, res) => {
    if (!validateToken(req, res)) return;

    let token = req.query.token;

    let serializedFields = ['hostname', 'name', 'ip', 'port'];

    log(`${token}: Requested server listing`);

    function serialize(server) {
        let result = {};

        for (let field of serializedFields) {
            result[field] = server[field];
        }

        return result;
    }

    let svs = Object.values(servers).map(serialize);

    res.send(response(svs));
});

app.get('/sendAll', async (req, res) => {
    if (!validateToken(req, res)) return;

    let {command, token, delay, wait} = req.query;

    if (!command) {
        res.send(error('Command field is required'));
        return;
    }

    delay = parseInt(delay);

    if (isNaN(delay)) {
        delay = 0;
    }

    log(`Sending ${servers.length} commands...`);

    if (!wait) {
        res.send(response(true));
    }

    await sleep(delay);

    const promises = Object.values(servers).map(server => server.execute(command));

    if (wait) {
        const all = await Promise.all(promises);

        const body = all.reduce((acc, res) => {
            acc[res.server] = res ? res.response : null;

            return acc;
        }, {});

        res.send(response(body));
    }
});

/*****************
 *    BINDING    *
 *****************/

app.listen(HTTP_PORT, () => {
    console.log('HTTP listening on ' + HTTP_PORT);
});
