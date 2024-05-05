const fs = require('fs');
const websocket = require('ws');
const msgpack = require('msgpack-lite');

const writeStream = fs.createWriteStream('data.json');
writeStream.write('[\n');

function getBufferFromHex(hex) {
    // used for debugging messages sent from the web client
    let buffer = Buffer.alloc(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) buffer.writeUInt8(parseInt(hex.substr(i, 2), 16), i / 2);
    return buffer;
}

(async () => {
    for (let i = 0; i < 6820; i++) {
        try {
            const ws = new websocket('wss://social.krunker.io/ws?', { origin: 'https://krunker.io' });
            ws.on('open', () => {
                console.log('connected');
                ws.send(Buffer.concat([msgpack.encode([ 'r', 'market', 'market', '1234567', 'Username', null, 0, String(i) ]), Buffer.from([0x0a, 0x0f])]));
            })
            ws.on('message', (data) => {
                console.log(data = msgpack.decode(data))

                switch (data[0]) {
                    // case 'pi':
                    //     ws.send(Buffer.concat([msgpack.encode([ 'po' ]), Buffer.from([Math.floor(Math.random() * 255), Math.floor(Math.random() * 255)])]));
                    //     break;
                    case 'fr':
                        writeStream.write(JSON.stringify({ id: i, data }) + ',\n\n');
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
})();
