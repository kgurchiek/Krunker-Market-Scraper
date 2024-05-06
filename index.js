const fs = require('fs');
const websocket = require('ws');
const msgpack = require('msgpack-lite');
const config = require('./config.json')

const writeStream = fs.createWriteStream('data.json');
writeStream.write('[\n');

function getBufferFromHex(hex) {
    // used for debugging messages sent from the web client
    let buffer = Buffer.alloc(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) buffer.writeUInt8(parseInt(hex.substr(i, 2), 16), i / 2);
    return buffer;
}

(async () => {
    let flips = [];
    for (let i = 0; i < 6820; i++) {
        try {
            const ws = new websocket('wss://social.krunker.io/ws?', { origin: 'https://krunker.io' });
            ws.on('open', () => {
                // console.log('connected');
                ws.send(Buffer.concat([msgpack.encode([ 'r', 'market', 'market', '1234567', 'Username', null, 0, String(i) ]), Buffer.from([0x0a, 0x0f])]));
            })
            ws.on('message', (data) => {
                data = msgpack.decode(data)
                // console.log(data);

                switch (data[0]) {
                    // case 'pi':
                    //     ws.send(Buffer.concat([msgpack.encode([ 'po' ]), Buffer.from([Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)])]));
                    //     break;
                    case 'fr':
                        writeStream.write(JSON.stringify({ id: i, data }) + ',\n\n');
                        if (Array.isArray(data[2])) {
                            const results = [...data[2]];
                            results.sort((a, b) => a.f - b.f);
                            for (let j = 0; j < results.length - 1 && j < config.maxFlips; j++) {
                                if (results[j + 1].f > results[j].f * 1.1 + 1) {
                                    const ws2 = new websocket('wss://social.krunker.io/ws?', { origin: 'https://krunker.io' });
                                    ws2.on('open', () => {
                                        // console.log('connected2');
                                        ws2.send(Buffer.concat([msgpack.encode(['r', 'itemsales', 'market', '1234567', 'Username', null, 0, String(i)]), Buffer.from([0x0a, 0x0f])]));
                                        ws2.send(Buffer.concat([msgpack.encode([ 'st', i, 3 ]), Buffer.from([Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)])]))
                                    })
                                    ws2.on('message', (data) => {
                                        data = msgpack.decode(data);
                                        // console.log(data);

                                        switch (data[0]) {
                                            case 'gd':
                                                ws2.close();
                                                let sum = 0;
                                                let date = new Date();
                                                date.setHours(0);
                                                date.setMinutes(0);
                                                date.setSeconds(0);
                                                for (const sale of data[1]) if ((date.getTime() - new Date(sale.d).getTime()) / (1000 * 60 * 60 * 24) < 7) sum += sale.t;
                                                let price = 0;
                                                for (let k = j; k >= 0; k--) price += results[k].f;
                                                if (price <= config.budget) console.log(flips[flips.push({ id: i, price, profit: (results[j + 1].f - 1 - (results[j].f * 1.1)) * (j + 1), count: j + 1, dailySales: sum / 7 }) - 1]);
                                                break;
                                        }
                                    })
                                }
                            }
                        }
                        ws.close();
                        break;
                    case 'error':
                        i--;
                        break;
                }
            })
        } catch (err) {
            console.error(err);
            i--;
        }
        await new Promise((resolve) => setTimeout(resolve, 1100));
    }
    writeStream.write(']');

    fs.writeFileSync('flips.json', JSON.stringify(flips.sort((a, b) => (b.profit / b.price) - (a.profit / a.price))));
})();
