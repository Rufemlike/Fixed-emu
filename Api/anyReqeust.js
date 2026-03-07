const axios = require("axios");
const {getToken} = require("../ticketManager");

async function routes(fastify) {
    fastify.post("/game-api/api/v1.0/session/login", async (request, reply)=>{
        const data = {
            "userProfile": {
                "userId": "1bde4705-34fd-489d-a7fe-93f3a2f5aefc",
                "username": "",
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
            "worldVersion": "BanSettings",
            "ipAddress": "91.219.235.155",
            "pendingMicroTransactions": [],
            "compatibleGameVersions": ["1.6.0.119"], // Важно: правильная версия
            "notifications": [],
            "sessionId": "4105b12d-6873-4f8e-9dd3-36d638fdc455"
        };

        return reply.send(data);
    });

    fastify.post("/ping", async (request, reply)=>{
        return reply.send({status: "pong"});
    });

    fastify.post("/game-api/api/v1.0/blockList/listBlocked", async (request, reply)=>{
        return reply.send({
            "status": "OK",
            "blockList": {
                "entries": [],
                "totalCount": 0,
                "page": {
                    "offset": 0,
                    "limit": 16
                }
            }
        });
    });

    fastify.get("/api/news", async (request, reply)=>{
        const data = {
            "items": [{
                "date": "08 Августа 2024",
                "excerpt": "Начало тестирования нового API",
                "category": "Development",
                "slug": "update-august-08-2024",
                "title": "1.2.0.102 Update",
                "coverImage": {
                    "src": "https://cms-cdn.bistudio.com/cms-static--reforger/images/08f81027-c102-4a4f-b9e7-fe12e8e6e8c2-NEWS%201280x720.jpg"
                },
                "fullUrl": "https://youtu.be/dQw4w9WgXcQ?si=zY34xDJ__8psHZ3i"
            }]
        };
        return reply.send(data);
    });

    fastify.post("/GetWorkshopToken", async (request, reply)=>{
        let authToken = getToken();
        let data = {"token": authToken};
        return reply.send(data);
    });

    fastify.post("/game-api/s2s-api/v1.0/sendTdEvents", async (request, reply)=>{
        const data = {"status":"OK"};
        return reply.send(data);
    });

    fastify.post("/game-api/api/v1.0/sendTdEvents", async (request, reply)=>{
        const data = {"status":"OK"};
        return reply.send(data);
    });

    fastify.post("/workshop-api/api/v3.0/assets/list", async (request, reply)=>{
        const url = 'https://api-ar-workshop.bistudio.com/workshop-api/api/v3.0/assets/list';
        const headers = {
            'Content-Type': 'application/json',
            'user-agent': "Arma Reforger/1.1.0.42 (Client; Windows)",
            'x-client-id': "$5d81ca9bbdd80f837dfe6380f436013"
        };
        let JsonData = JSON.stringify(request.body);
        const response = await axios.post(url, JsonData, { headers });
        return reply.send(response.data);
    });

    fastify.post("/getLobby", async (request, reply) => {
        const data = {"rooms": []};
        return reply.send(data);
    });

    // КРИТИЧЕСКИ ВАЖНО: правильный ответ для world
    fastify.get("/game-api/api/v1.0/world", async (request, reply) => {
        // Проверяем параметры запроса
        const platformId = request.query.platformId || "ReforgerSteam";
        const clientVersion = request.query.clientVersion || "1.6.0";
        
        console.log(`World request: platformId=${platformId}, clientVersion=${clientVersion}`);
        
        // Возвращаем правильную структуру, которую ожидает игра
        const data = {
            "version": "BanSettings",
            "gameData": {
                "BanSettings": {
                    "m_sDesc": "Ban Logic Cleansweep",
                    "m_BanSettings": {
                        "m_fScoreThreshold": 10.0,
                        "m_fScoreDecreasePerMinute": 0.2,
                        "m_fScoreMultiplier": 0.2,
                        "m_fAccelerationMin": 1.0,
                        "m_fAccelerationMax": 6.0,
                        "m_fBanEvaluationLight": 0.8,
                        "m_fBanEvaluationHeavy": 1.0,
                        "m_fCrimePtFriendKill": 1.0,
                        "m_fCrimePtTeamKill": 0.7,
                        "m_fQualityTimeTemp": 1.0,
                        "m_bVotingSuggestionEnabled": 0
                    }
                }
            },
            // Добавляем информацию о мире
            "worlds": [
                {
                    "id": "58D0FB3206B6F859",
                    "name": "Arma Reforger",
                    "version": clientVersion,
                    "scenarios": [
                        {
                            "id": "{BEF094A5F7F3211B}worlds/GameMaster/GM_Eden.ent",
                            "name": "Game Master - Eden",
                            "type": "GameMaster"
                        },
                        {
                            "id": "{}worlds/ConflictEveron/ConflictEveron.ent",
                            "name": "Conflict - Everon",
                            "type": "Conflict"
                        }
                    ]
                }
            ]
        };
        
        return reply.send(data);
    });

    fastify.get("/game-api/api/v1.0/dummy", async (request, reply) => {
        const data = {};
        return reply.send(data);
    });
}

module.exports = routes;