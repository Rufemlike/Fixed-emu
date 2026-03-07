const {Servers} = require("../db");
const axios = require("axios");
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const secretKey = 'my_secret_key';

async function routes(fastify) {

    fastify.post("/game-api/s2s-api/v1.0/lobby/dedicatedServers/registerUnmanagedServer", async (request, reply)=>{
        let body = request.body;
        let serverID;
        let jwtToken = body.accessToken;

        if(!jwtToken){
            const header = {
                "x-client-id": request.headers["x-client-id"],
                "x-client-secret": request.headers["x-client-secret"],
                "content-type": request.headers["content-type"]
            };

            let bohemiaRegister = await axios.post("https://api-ar-game.bistudio.com/game-api/s2s-api/v1.0/lobby/dedicatedServers/registerUnmanagedServer", body, { headers: header });
            jwtToken = bohemiaRegister.data.ownerToken;
        }
        
        const decoded = jwt.decode(jwtToken);
        serverID = decoded ? decoded.serverId : uuidv4();
        
        let hostServerId = uuidv4();
        let data = {
            "dsConfig":{
                "providerServerId": serverID,
                "dedicatedServerId": hostServerId,
                "region": "",
                "game": {
                    "name": body["name"] || "Arma Reforger Server",
                    "scenarioId": body["scenarioId"] || "{BEF094A5F7F3211B}worlds/GameMaster/GM_Eden.ent",
                    "hostedScenarioModId": body["hostedScenarioModId"] || "",
                    "playerCountLimit": body["playerCountLimit"] || 32,
                    "gameNumber": 0,
                    "autoJoinable": false,
                    "visible": true,
                    "supportedGameClientTypes": body["supportedGameClientTypes"] || ["PLATFORM_PC"],
                    "gameInstanceFiles": {
                        "fileReferences": []
                    },
                    "mods": body["mods"] || [],
                    "tags": body["tags"] || [],
                    "gameMode": body["gameMode"] || "GameMaster"
                }
            },
            "ownerToken": body.accessToken ? body.accessToken : jwtToken,
        };
        
        await Servers.updateOne(
            { serverID: hostServerId },
            {
                $set: { 
                    data: {},
                    createdAt: new Date()
                },
                $currentDate: { lastUpdate: true }
            },
            { upsert: true }
        );
        
        return reply.send(data);
    });

    fastify.post("/game-api/s2s-api/v1.0/lobby/rooms/register", async (request, reply)=>{
        let body = request.body;
        let serverID = body["dedicatedHostId"];

        let decoded = null;
        try {
            decoded = jwt.decode(body.accessToken);
        } catch (e) {
            console.log("JWT decode error:", e.message);
        }
        
        let hostServerID = decoded ? decoded.serverId : serverID;

        // Проверяем наличие сервера в MongoDB
        let server = await Servers.findOne({ serverID: serverID });
        const currentDate = new Date();
        
        if (!server) {
            console.log("Create server in license");
            const header = {
                "x-client-id": request.headers["x-client-id"],
                "x-client-secret": request.headers["x-client-secret"],
                "content-type": request.headers["content-type"]
            };

            try {
                let bohemiaAuth = await axios.post("https://api-ar-game.bistudio.com/game-api/s2s-api/v1.0/lobby/rooms/register", body, { headers: header });

                if (bohemiaAuth.data && bohemiaAuth.data.mpRoom) {
                    bohemiaAuth.data["mpRoom"]["time"] = currentDate;
                    bohemiaAuth.data["mpRoom"]["isLicense"] = true;
                    bohemiaAuth.data["mpRoom"]["official"] = true;

                    // Сохраняем сервер в MongoDB
                    await Servers.updateOne(
                        { serverID: serverID },
                        {
                            $set: { 
                                data: bohemiaAuth.data["mpRoom"], 
                                password: body["password"] || ""
                            },
                            $currentDate: { lastUpdate: true }
                        },
                        { upsert: true }
                    );
                }

                return reply.send(bohemiaAuth.data);
            } catch (proxyError) {
                console.log("Proxy registration failed, using local");
                // Если прокси не сработал, создаем локальный сервер
            }
        }

        // Локальная регистрация сервера
        let data = {
            "roomId": `${hostServerID}`,
            "mpRoom": {
                "id": `${hostServerID}`,
                "scenarioId": body["scenarioId"] || "{BEF094A5F7F3211B}worlds/GameMaster/GM_Eden.ent",
                "name": body["name"] || "Arma Reforger Server",
                "scenarioVersion": body["scenarioVersion"] || "",
                "scenarioName": body["scenarioName"] || "Game Master - Eden",
                "region": body["region"] || "n/a",
                "gameVersion": body["gameVersion"] || "1.6.0.119",
                "hostType": "CommunityDs",
                "dedicated": true,
                "official": false,
                "joinable": true,
                "visible": true,
                "passwordProtected": !!(body["password"]),
                "created": currentDate.getTime(),
                "updated": currentDate.getTime(),
                "hostAddress": body["hostAddress"] || "0.0.0.0:2001",
                "hostUserId": body["dedicatedHostId"] || hostServerID,
                "playerCountLimit": body["playerCountLimit"] || 32,
                "playerCount": 0,
                "autoJoinable": body["autoJoinable"] || false,
                "directJoinCode": Math.floor(1000000000 + Math.random() * 9000000000).toString(),
                "supportedGameClientTypes": body["supportedGameClientTypes"] || ["PLATFORM_PC"],
                "dsLaunchTimestamp": currentDate.getTime(),
                "dsProviderServerId": hostServerID,
                "mods": body["mods"] || [],
                "battlEye": false,
                "favorite": false,
                "gameMode": body["gameMode"] || "GameMaster",
                "pingSiteId": "frankfurt",
                "platformName": "Windows",
                "runtimeStats": {
                    "needRestart": false
                },
                "sessionId": currentDate.toISOString().replace(/[-:]/g, '').substring(0, 15) + uuidv4().substring(0, 4)
            }
        };

        await Servers.updateOne(
            { serverID: serverID },
            {
                $set: { 
                    data: data["mpRoom"], 
                    password: body["password"] || "" 
                },
                $currentDate: { lastUpdate: true }
            },
            { upsert: true }
        );
        
        return reply.send(data);
    });

    fastify.post("/game-api/s2s-api/v1.0/lobby/rooms/remove", async (request, reply)=>{
        let body = request.body;
        let serverID = body["dedicatedServerId"];
        let server = await Servers.findOne({ serverID: serverID });
        
        if(!server){
            return reply.code(404).send({status: "server not found"});
        }
        
        await Servers.deleteOne({ serverID: serverID });
        return reply.send({status: "OK"});
    });
}

module.exports = routes;