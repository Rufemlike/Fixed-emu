const net = require("net");
const config = require("./config.json");
const axios = require("axios");

let ticket = '';
let token = '';
let host = config.Workshop.IP;
let port = config.Workshop.PORT;

function setTicket(newTicket) {
    ticket = newTicket;
}

function setToken(newToken) {
    return token = newToken;
}

function getToken() {
    return token;
}

function getTicketFromServer(host, port) {
    return new Promise((resolve, reject) => {
        const client = new net.Socket();

        client.connect(port, host, () => {
            console.log('Connected to server');
            client.write(config.Workshop.KEY);
        });

        client.on('data', (data) => {
            const ticketHex = data.toString().trim();
            console.log('Received ticket (hex):', ticketHex);
            resolve(ticketHex);
            client.destroy();
        });

        client.on('error', (err) => {
            console.error('Error:', err);
            reject(err);
            client.destroy();
        });

        client.on('close', () => {
            console.log('Connection closed');
        });
    });
}

function hexToBase64(hexString) {
    const buffer = Buffer.from(hexString, 'hex');
    return buffer.toString('base64');
}

async function getAccessToken(){
    const url = 'https://api-ar-id.bistudio.com/game-identity/api/v1.1/identities/reforger/auth?include=profile';
    const headers = {
        'Content-Type': 'application/json',
        'user-agent': "Arma Reforger/1.1.0.42 (Client; Windows)",
    };

    let JsonData = JSON.stringify({
        "platform": "steam",
        "token": ticket,
        "platformOpts": {
            "appId": "1874880"
        }
    });
    
    const response = await axios.post(url, JsonData, { headers });
    return response.data["accessToken"];
}

async function fetchTicketPeriodically() {
    try {
        let ticketHex = await getTicketFromServer(host, port);
        let ticketBase64 = hexToBase64(ticketHex);
        setTicket(ticketBase64);
        console.log('Received ticket (base64):', ticketBase64);
        let token = await getAccessToken();
        console.log('Received token:', token);
        setToken(token);
    } catch (err) {
        console.error('Failed to get ticket:', err);
    }
}

function startPeriodicTask() {
    if (!config.API.ActivateWorkshop) {
        console.log('Workshop is deactivated, set static token');
        // Используем реальный токен из логов игры
        setToken("eyJhbGciOiJSUzUxMiJ9.eyJpYXQiOjE3NzI4NzA4MjEsInNlcnZlcklkIjoiY2E3MTY0NTMtMTg4OC00ZDhhLWE3ZmUtZTkyYTJmZGRiOTU2Iiwic2VydmVyVHlwZSI6IkNvbW11bml0eVNlbGZIb3N0ZWQiLCJvd25lclR5cGUiOiJBbm9ueW1vdXMifQ.pBkuRzJ9G06y7_CggaZ19vlkUA9GpthHXkCyfghQ137qp7nkVafg6kpMAajpT2jZRU5mroM0GC4Yv6j9MnkAUXRytFziC5fg-JruVSY3EGHmOGLCObK5UxPS-WPI8PApdk0VyQvcvzrGcPpvOFIjHXde1GQbJj1fgY0KXXDOaSOkO3_OrGb_9zSOP3x7FCPLC2KMok4cGb-WX5loNe0KQKK6dFrUJ5KHS81BxsspbZZVpmFVkAJZJYecaJyvMPyuAM8t7zEf0Erw0SrohRnFwzeLUBfRnhL_C0rLb2aKGTydtqDFXPltESdES8Sde279HXVj0qDkole1vLEIVZ6L1w");
        return;
    }
    
    console.log('Workshop is activated');
    console.log("Start auth ticket");
    fetchTicketPeriodically();
    setInterval(fetchTicketPeriodically, 30 * 50 * 1000);
}

module.exports = {
    getToken,
    startPeriodicTask
};