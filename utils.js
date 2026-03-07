// utils.js
function makeid(length, onlyNumbers = false) {
    let result = '';
    // Используем более широкий набор символов для увеличения энтропии
    let characters = onlyNumbers 
        ? '0123456789' 
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

function makeSessionTicket() {
    // Генерируем тикет длиной 512 символов как требует игра
    // Используем комбинацию цифр и букв для большей уникальности
    const length = 512;
    const characters = '0123456789';
    let ticket = '';
    
    for (let i = 0; i < length; i++) {
        ticket += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return ticket;
}

function parseRequestBody(body) {
    // Обрабатывает разные форматы запросов от клиента Arma Reforger
    if (!body) return {};
    
    // Если тело - строка, пробуем распарсить JSON
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (e) {
            return body;
        }
    }
    
    // Если тело - объект с одним ключом, который содержит JSON строку
    if (body && typeof body === 'object') {
        const keys = Object.keys(body);
        if (keys.length === 1 && typeof body[keys[0]] === 'string') {
            const value = body[keys[0]];
            if (value.startsWith('{') || value.startsWith('[')) {
                try {
                    return JSON.parse(value);
                } catch (e) {
                    // Не валидный JSON, возвращаем как есть
                }
            }
        }
    }
    
    return body;
}

module.exports = { makeid, makeSessionTicket, parseRequestBody };