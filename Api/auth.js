const axios = require("axios");
const { Users, Servers } = require("../db");
const { v4: uuidv4 } = require('uuid');
const { makeid } = require("../utils");

async function routes(fastify) {
    
    // POST /game-api/s2s-api/v1.0/lobby/rooms/acceptPlayer - принятие игрока
    fastify.post("/game-api/s2s-api/v1.0/lobby/rooms/acceptPlayer", async (request, reply) => {
        try {
            console.log("========== ACCEPT PLAYER REQUEST ==========");
            console.log("AcceptPlayer body:", JSON.stringify(request.body, null, 2));
            
            const body = request.body;
            const sessionTicket = body?.sessionTicket;
            
            console.log("Session ticket:", sessionTicket);
            
            // Проверяем, есть ли сервер с isLicense = true
            // Нам нужно узнать, к какому серверу подключается игрок
            // Для этого нужно найти сервер по sessionTicket или другим данным
            // Но пока упростим - проверим есть ли вообще лицензионные серверы
            
            const licenseServer = await Servers.findOne({ "data.isLicense": true });
            const useLicenseProxy = licenseServer ? true : false;
            
            console.log("License server found:", !!licenseServer);
            
            // Пытаемся найти пользователя по sessionTicket
            let user = null;
            if (sessionTicket) {
                try {
                    user = await Users.findOne({ "ticket": sessionTicket });
                    console.log("User found by ticket:", !!user);
                } catch (dbError) {
                    console.error("Database error:", dbError);
                }
            }

            // Если пользователь не найден И есть лицензионный сервер,
            // пробуем проксировать запрос к официальному API
            if (!user && useLicenseProxy) {
                console.log("User not found, trying to proxy to official API");
                
                const headers = {
                    "x-client-id": request.headers["x-client-id"],
                    "x-client-secret": request.headers["x-client-secret"],
                    "content-type": request.headers["content-type"]
                };
                
                try {
                    const response = await axios.post(
                        "https://api-ar-game.bistudio.com/game-api/s2s-api/v1.0/lobby/rooms/acceptPlayer",
                        body,
                        { headers, timeout: 5000 }
                    );
                    console.log("Proxy successful");
                    return reply.send(response.data);
                } catch (proxyError) {
                    console.error("Proxy error:", proxyError.message);
                    // Если прокси не сработал, продолжаем с локальным ответом
                }
            }

            // Формируем локальный ответ
            const responseData = {
                "userProfile": {
                    "userId": user?.userID || "90561764-3df3-4da2-bafb-1c241f33eb18",
                    "username": user?.username || body?.platformUsername || "Player",
                    "renameCount": -1,
                    "currencies": {
                        "HardCurrency": 0,
                        "SoftCurrency": 0
                    },
                    "countryCode": "UA",
                    "overallPlayTime": 66230,
                    "tester": false,
                    "isDeveloperAccount": false,
                    "rentedServers": {
                        "entries": [],
                        "visitedGames": []
                    }
                },
                "character": {
                    "id": user?.userID || "90561764-3df3-4da2-bafb-1c241f33eb18",
                    "name": user?.username || body?.platformUsername || "Player",
                    "version": 1711140949069791232,
                    "data": "{\"m_aStats\":[0.0,53337.69140625,43835.9453125,131749.46875,98400.2734375,14878.484375,0.0,50760.828125,14.0,106.0,3366.0,78.0,7.0,2.0,66.0,31465.36328125,19135.662109375,0.0,0.0,2.0,2.0,0.0,27604.794921875,19.0,13.0,4.0,0.0,0.0,0.0,2.0,0.0,6520919040.0,1.0,0.0,0.0,0.0,0.0,0.0,0.0]}"
                },
                "sessionTicket": sessionTicket || "test_ticket_" + Date.now(),
                "secret": "8f5e73fcdfead3b2e79bae2fef52ed2b19ffa0272ba76459cbd534937bb497d09e5145e85ae93009689a9e4946d3af4f548d8830b93c24dc891519017875a954a53e46d2fee91952",
                "platformIdentities": {
                    "biAccountId": "51dcf826-17db-4f87-91d5-4e95cdb853cf",
                    "steamId": user?.steamid || body?.steamId || "76561199570784232"
                },
                "gameClientType": body?.gameClientType || "PLATFORM_PC",
                "platformUsername": user?.username || body?.platformUsername || "Player"
            };

            console.log("Sending acceptPlayer response");
            return reply.send(responseData);
            
        } catch (error) {
            console.error("========== ACCEPT PLAYER ERROR ==========");
            console.error("Error:", error);
            
            // Даже при ошибке возвращаем успешный ответ
            return reply.send({
                "userProfile": {
                    "userId": "90561764-3df3-4da2-bafb-1c241f33eb18",
                    "username": "Player",
                    "renameCount": -1,
                    "currencies": {
                        "HardCurrency": 0,
                        "SoftCurrency": 0
                    },
                    "countryCode": "UA",
                    "overallPlayTime": 66230,
                    "tester": false,
                    "isDeveloperAccount": false,
                    "rentedServers": {
                        "entries": [],
                        "visitedGames": []
                    }
                },
                "character": {
                    "id": "90561764-3df3-4da2-bafb-1c241f33eb18",
                    "name": "Player",
                    "version": 1711140949069791232,
                    "data": "{\"m_aStats\":[0.0,53337.69140625,43835.9453125,131749.46875,98400.2734375,14878.484375,0.0,50760.828125,14.0,106.0,3366.0,78.0,7.0,2.0,66.0,31465.36328125,19135.662109375,0.0,0.0,2.0,2.0,0.0,27604.794921875,19.0,13.0,4.0,0.0,0.0,0.0,2.0,0.0,6520919040.0,1.0,0.0,0.0,0.0,0.0,0.0,0.0]}"
                },
                "sessionTicket": request.body?.sessionTicket || "error_ticket_" + Date.now(),
                "secret": "8f5e73fcdfead3b2e79bae2fef52ed2b19ffa0272ba76459cbd534937bb497d09e5145e85ae93009689a9e4946d3af4f548d8830b93c24dc891519017875a954a53e46d2fee91952",
                "platformIdentities": {
                    "biAccountId": "51dcf826-17db-4f87-91d5-4e95cdb853cf",
                    "steamId": "76561199570784232"
                },
                "gameClientType": "PLATFORM_PC",
                "platformUsername": "Player"
            });
        } finally {
            console.log("========== ACCEPT PLAYER REQUEST END ==========");
        }
    });

    // POST /game-identity/api/v1.1/identities/reforger/auth - аутентификация
    fastify.post("/game-identity/api/v1.1/identities/reforger/auth", async (request, reply) => {
        try {
            const body = request.body;
            
            if (!body || !body.token) {
                return reply.code(400).send({ error: "Токен обязателен" });
            }
            
            const bufferFromBase64 = Buffer.from(body["token"], 'base64');
            const hexString = bufferFromBase64.toString('hex');

            const ticketData = await axios.get("https://api.steampowered.com/ISteamUserAuth/AuthenticateUserTicket/v1/", {
                params: {
                    key: "D1BAB58EDEBE08D06ABAF7CE57F6268C",
                    appid: "480",
                    ticket: hexString
                }
            });

            if (!ticketData.data || !ticketData.data.response || !ticketData.data.response.params) {
                return reply.code(401).send({ error: "Невалидный Steam тикет" });
            }

            const steamid = ticketData.data["response"]["params"]["steamid"];
            
            const steamUserInfo = await axios.get("https://community.steam-api.com/ISteamUser/GetPlayerSummaries/v2/", {
                params: {
                    key: "D1BAB58EDEBE08D06ABAF7CE57F6268C",
                    steamids: steamid
                }
            });

            const steamUsername = steamUserInfo.data["response"]["players"][0]["personaname"];
            const userID = uuidv4();
            const accessToken = "eyJhbGciOiJSUzUxMiJ9.eyJpYXQiOjE3MjM5NDA3NDUsImV4cCI6MTcyMzk0NDM0NSwiaXNzIjoiZ2kiLCJhdWQiOiJnaSwgY2xpZW50LCBiaS1hY2NvdW50IiwiZ2lkIjoiYmNkM2NkMDctZjg3ZC00YzUwLTk3ZmItMzcyNWU5NGUzYTcxIiwiZ21lIjoicmVmb3JnZXIiLCJwbHQiOiJzdGVhbSJ9.INGYyPfKS2bkGk1nWLnydzczwHtHCycAUE5QRMHrL0f3nAIA3cv6uXVwHOUpqdEgDqdqo49YCTBE6BHam8MbWHQysilTX04e-Z2XXWX6YePIukQ6fjyH0xw1C_KKXzTOekbmlU-KCZ9dLi3D8vVC-4fkWwrL3czxpCclbwRxYQPOTmoTy5G-Fv3-U4edKET3a5-RyVMRsD5p0K_6wba3l6j8cET0SXH-5P46yxxyp1mUu76SdLT2nDDmEYdIgNWkWpXO-ONyxd0CJr_M3RQaTSIMF2r5A4gyMMpzlvF5kmnhOkiO0p1i1-1WAG21yrMrz6xM0DjAPLJF" + makeid(10, true);

            await Users.updateOne(
                { steamid: steamid },
                {
                    $set: { accessToken: accessToken, updatedAt: new Date() },
                    $setOnInsert: {
                        username: steamUsername,
                        userID: userID,
                        steamid: steamid,
                        createdAt: new Date()
                    }
                },
                { upsert: true }
            );

            const userFromDb = await Users.findOne({ steamid: steamid });

            return reply.send({
                identityId: userFromDb.userID,
                accessToken: userFromDb.accessToken,
                accessTokenExp: 1912663541,
                identity: {
                    id: userFromDb.userID,
                    game: "reforger",
                    links: [
                        {
                            platform: "steam",
                            platformId: steamid,
                            createdAt: new Date().toISOString()
                        },
                        {
                            platform: "bi-account",
                            platformId: "51dcf826-17db-4f87-91d5-4e95cdb853cf",
                            createdAt: "2024-03-18T09:18:12"
                        }
                    ],
                    linkHistory: [],
                    createdAt: "2024-01-02T20:05:43",
                    updatedAt: "2024-03-18T08:18:12"
                }
            });
        } catch (error) {
            console.error("Ошибка аутентификации:", error.message);
            if (error.response) {
                console.error("Детали ошибки:", error.response.data);
            }
            return reply.code(500).send({ error: "Внутренняя ошибка сервера" });
        }
    });

}

module.exports = routes;