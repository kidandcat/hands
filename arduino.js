const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const port = new SerialPort('/dev/ttyACM0', { baudRate: 115200 });
const parser = port.pipe(new Readline({ delimiter: '\n' }));

port.on("open", () => {
    console.log('serial port open');
});

parser.on('data', data => {
    console.log('got word from arduino:', data);
});

function write(data){
    port.write(data);
}

let writting = false
function writeUnreliable(data){
    if (writting) return
    writting = true
    port.write(data, () => {
        writting = false
    });
}

module.exports = {
    keyClick: (key) => write(`k${key}\n`),
    keyPress: (key) => write(`u${key}\n`),
    keyRelease: (key) => write(`y${key}\n`),
    mouseMove: (x, y) => writeUnreliable(`m${x}${y}\n`),
    mouseMoveRelative: (x, y) => writeUnreliable(`z${x}${y}\n`),
    mousePress: () => write(`p\n`),
    mouseRightClick: () => write(`b\n`),
    mouseRelease: () => write(`h\n`),
    mouseDoubleClick: async() => {
        this.mousePress()
        await new Promise(r => setTimeout(r, 500));
        this.mouseRelease()
        await new Promise(r => setTimeout(r, 500));
        this.mousePress()
        await new Promise(r => setTimeout(r, 500));
        this.mouseRelease()
    },
}