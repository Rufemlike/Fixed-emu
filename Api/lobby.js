const { Servers, Users } = require("../db");
const { makeid, makeSessionTicket, parseRequestBody } = require("../utils");
console.log("Загрузка lobby.js с улучшенной обработкой join");

async function routes(fastify) {
    // POST /game-api/api/v1.0/lobby/rooms/search - поиск серверов
    fastify.post("/game-api/api/v1.0/lobby/rooms/search", async (request, reply) => {
        try {
            const servers = await Servers.find({}).toArray();
            const rooms = servers.map(server => server.data).filter(room => room && room.id);
            
            return reply.send({
                rooms: rooms,
                searchFrom: 0,
                totalCount: rooms.length
            });
        } catch (error) {
            console.error("Ошибка получения списка серверов:", error);
            return reply.code(500).send({ error: "Внутренняя ошибка сервера" });
        }
    });

    // POST /game-api/api/v1.0/lobby/rooms/getRoomsByIds - получение серверов по ID
    fastify.post("/game-api/api/v1.0/lobby/rooms/getRoomsByIds", async (request, reply) => {
        try {
            const body = parseRequestBody(request.body);
            const roomIds = body.roomIds || [];
            
            if (!Array.isArray(roomIds)) {
                return reply.code(400).send({ error: "roomIds должен быть массивом" });
            }
            
            const servers = await Servers.find({ "data.id": { $in: roomIds } }).toArray();
            
            return reply.send({
                rooms: servers.map(server => server.data),
                searchFrom: 0,
                totalCount: servers.length
            });
        } catch (error) {
            console.error("Ошибка получения серверов по ID:", error);
            return reply.code(500).send({ error: "Внутренняя ошибка сервера" });
        }
    });

    // POST /game-api/api/v1.0/lobby/rooms/listPlayers - список игроков
    fastify.post("/game-api/api/v1.0/lobby/rooms/listPlayers", async (request, reply) => {
        return reply.send({
            "connectedPlayers": [],
            "queuePlayers": []
        });
    });

    // POST /game-api/api/v1.0/lobby/rooms/verifyPassword - проверка пароля
    fastify.post("/game-api/api/v1.0/lobby/rooms/verifyPassword", async (request, reply) => {
        try {
            const body = parseRequestBody(request.body);
            
            const roomid = body.roomId;
            const password = body.password;

            if (!roomid) {
                return reply.code(400).send({ error: "roomId обязателен" });
            }

            const server = await Servers.findOne({ "data.id": roomid });
            
            if (!server || server.password !== password) {
                return reply.code(403).send({
                    "code": 403,
                    "errorType": "PasswordMismatch",
                    "apiCode": "PasswordMismatch",
                    "message": "Неверный пароль",
                    "uid": "0ec0a582-46bc-4748-9743-585f757e06d0"
                });
            }

            return reply.send({ "status": "OK" });
        } catch (error) {
            console.error("Ошибка проверки пароля:", error);
            return reply.code(500).send({ error: "Внутренняя ошибка сервера" });
        }
    });

    // POST /game-api/api/v1.0/lobby/rooms/join - присоединение к серверу
    fastify.post("/game-api/api/v1.0/lobby/rooms/join", async (request, reply) => {
        try {
            console.log("========== JOIN REQUEST ==========");
            console.log("Join request body:", JSON.stringify(request.body));

            let body = request.body;
            let parsedBody = {};

            // Специальная обработка для странного формата Arma Reforger
            if (body && typeof body === 'object') {
                const keys = Object.keys(body);
                console.log("Body keys:", keys);

                // Проверяем, есть ли ключ, который является JSON строкой
                for (const key of keys) {
                    // Пробуем распарсить ключ как JSON
                    if (typeof key === 'string' && (key.startsWith('{') || key.includes('accessToken'))) {
                        try {
                            // Пробуем распарсить сам ключ как JSON
                            const parsed = JSON.parse(key);
                            console.log("Successfully parsed key as JSON:", parsed);
                            parsedBody = parsed;
                            break;
                        } catch (e) {
                            console.log("Key is not valid JSON:", e.message);
                        }
                    }

                    // Если значение не пустое, пробуем распарсить его
                    if (typeof body[key] === 'string' && body[key].length > 0) {
                        try {
                            const parsed = JSON.parse(body[key]);
                            console.log("Successfully parsed value as JSON:", parsed);
                            parsedBody = parsed;
                            break;
                        } catch (e) {
                            console.log("Value is not valid JSON:", e.message);
                        }
                    }
                }
            }

            // Если не удалось распарсить специальным способом, используем стандартный
            if (Object.keys(parsedBody).length === 0) {
                parsedBody = parseRequestBody(request.body);
            }

            console.log("Final parsed body:", JSON.stringify(parsedBody, null, 2));

            const roomID = parsedBody.roomId;
            if (!roomID) {
                console.error("roomId отсутствует в запросе");
                return reply.code(400).send({
                    error: "roomId обязателен",
                    receivedBody: parsedBody
                });
            }

            const server = await Servers.findOne({ "data.id": roomID });
            console.log("Server found:", !!server);

            if (!server) {
                console.error("Сервер не найден, ID:", roomID);
                return reply.code(404).send({ error: "Сервер не найден" });
            }

            // Генерируем тикет правильной длины (512 символов)
            const sessionTicket = makeSessionTicket();
            console.log("Generated session ticket length:", sessionTicket.length);

            // Ищем пользователя по accessToken
            const accessToken = parsedBody.accessToken || parsedBody.token;
            if (!accessToken) {
                console.error("accessToken отсутствует в запросе");
                console.log("Возвращаем тестовый ответ без проверки токена");
                return reply.send({
                    "sessionTicket": sessionTicket,
                    "secret": "8f5e73fcdfead3b2e79bae2fef52ed2b19ffa0272ba76459cbd534937bb497d09e5145e85ae93009689a9e4946d3af4f548d8830b93c24dc891519017875a954a53e46d2fee91952",
                    "address": server.data.hostAddress,
                    "inviteToken": "dVABIFt7UE1lX2hQEUwQWEZVUgocJzECXmZcfnBCUBR/Y2IpAnNWIV9FMA==",
                    "joinResult": "Join"
                });
            }

            console.log("Looking for user with accessToken:", accessToken.substring(0, 50) + "...");

            // Пробуем найти пользователя и сохранить тикет
            let user = null;
            try {
                user = await Users.findOneAndUpdate(
                    { "accessToken": accessToken },
                    { $set: { ticket: sessionTicket } },
                    { returnDocument: "after" }
                );
            } catch (dbError) {
                console.error("Database error:", dbError);
            }

            console.log("User found and updated:", !!(user && user.value));

            // Всегда возвращаем успешный ответ с правильным тикетом
            return reply.send({
                "sessionTicket": sessionTicket,
                "secret": "8f5e73fcdfead3b2e79bae2fef52ed2b19ffa0272ba76459cbd534937bb497d09e5145e85ae93009689a9e4946d3af4f548d8830b93c24dc891519017875a954a53e46d2fee91952",
                "address": server.data.hostAddress,
                "inviteToken": "dVABIFt7UE1lX2hQEUwQWEZVUgocJzECXmZcfnBCUBR/Y2IpAnNWIV9FMA==",
                "joinResult": "Join"
            });

        } catch (error) {
            console.error("========== JOIN ERROR ==========");
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            console.error("Error stack:", error.stack);

            // Даже при ошибке возвращаем успешный ответ для тестирования
            return reply.send({
                "sessionTicket": makeSessionTicket(), // Используем правильную длину
                "secret": "8f5e73fcdfead3b2e79bae2fef52ed2b19ffa0272ba76459cbd534937bb497d09e5145e85ae93009689a9e4946d3af4f548d8830b93c24dc891519017875a954a53e46d2fee91952",
                "address": "127.0.0.1:2001",
                "inviteToken": "dVABIFt7UE1lX2hQEUwQWEZVUgocJzECXmZcfnBCUBR/Y2IpAnNWIV9FMA==",
                "joinResult": "Join"
            });
        } finally {
            console.log("========== JOIN REQUEST END ==========");
        }
    });

    // POST /game-api/api/v1.0/lobby/getPingSites - список пинг-сайтов
    fastify.post("/game-api/api/v1.0/lobby/getPingSites", async (request, reply) => {
        return reply.send({
            "pingSites": [
                {"id":"frankfurt","address":"ping-location-de.nitrado.net","ipAddress":"31.214.130.69","location":{"latitude":51.29930114746094,"longitude":9.491000175476074},"mappedRegions":["eu-ffm"]},
                {"id":"london","address":"ping-location-ukln.nitrado.net","ipAddress":"46.251.234.83","location":{"latitude":51.50640106201172,"longitude":-0.019999999552965164}},
                {"id":"los_angeles","address":"ping-location-usla.nitrado.net","ipAddress":"37.10.127.60","location":{"latitude":34.05440139770508,"longitude":-118.24400329589844},"mappedRegions":["us-la"]},
                {"id":"miami","address":"ping-location-usmi.nitrado.net","ipAddress":"109.230.214.92","location":{"latitude":25.774099349975586,"longitude":-80.18170166015625},"mappedRegions":["us-mi"]},
                {"id":"new_york","address":"ping-location-usny.nitrado.net","ipAddress":"134.255.251.148","location":{"latitude":40.71229934692383,"longitude":-74.00679779052734},"mappedRegions":["us-ny"]},
                {"id":"singapore","address":"ping-location-sg.nitrado.net","ipAddress":"128.0.112.235","location":{"latitude":1.298200011253357,"longitude":103.78399658203125},"mappedRegions":["ap-sg"]},
                {"id":"sydney","address":"ping-location-ausy.nitrado.net","ipAddress":"128.0.115.134","location":{"latitude":-33.94300079345703,"longitude":151.18099975585938},"mappedRegions":["ap-sy"]},
                {"id":"tokyo","address":"ping-location-jpto.nitrado.net","ipAddress":"31.214.142.8","location":{"latitude":35.67190170288086,"longitude":139.68499755859375},"mappedRegions":["ap-to"]}
            ]
        });
    });
}

module.exports = routes;