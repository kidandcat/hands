const { app, BrowserWindow, ipcMain, Notification } = require('electron')
const robot = require('robotjs')
const path = require('path')

const createWindow = () => {
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            backgroundThrottling: false
        }
    })
    ipcMain.on('fingers-data', fingersData)
    win.loadFile('index.html')
}

app.whenReady().then(() => {
    createWindow()
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})


const slowMoveMod = 0.5
const slowMoveThreshold = 6
const mouseBaseSpeed = 1500
const quickMoveMod = 3
const quickMoveThreshold = 25
const gesturesDelay = 600
const scrollMultiplier = 2

const pinchedMousef = pinchedFinger(0.03)
const pinchedLeftf = pinchedFinger(0.03)
const pinchedRightf = pinchedFinger(0.03)
const pinchedPinkyf = pinchedFinger(0.03)
let scrolling = false
let paused = false
let pausing = false
let scrollBuffer = 0
let moveBufferX = 0
let moveBufferY = 0
let timerLeft, timerRight

function fingersData(event, data) {
    if (data.length > 0) {
        let hand1 = data[0]
        const finger1 = hand1[4]
        const finger2 = hand1[8]
        const finger3 = hand1[12]
        const finger4 = hand1[16]
        const finger5 = hand1[20]
        // const finger1base = hand1[1]
        // const finger2base = hand1[5]
        // const finger3base = hand1[9]
        // const finger4base = hand1[13]
        // const finger5base = hand1[17]

        if (!finger5 || !finger1 || pausing) return

        const [pinchedMouse, unpinchedMouse, statusMouse] = pinchedMousef(finger1, finger2)
        const [pinchedLeft, unpinchedLeft, statusLeft] = pinchedLeftf(finger1, finger3)
        const [pinchedRight, unpinchedRight, statusRight] = pinchedRightf(finger1, finger4)
        const [pinchedPinky, unpinchedPinky, statusPinky] = pinchedPinkyf(finger1, finger5)

        if (statusMouse && statusLeft && statusRight && statusPinky) {
            paused = !paused
            pausing = true
            if (paused) app.dock.setIcon(process.resourcesPath + "/hand_off.png")
            else app.dock.setIcon(process.resourcesPath + "/hand.png")
            goRightUp()
            goLeftUp()
            setTimeout(() => {
                pausing = false
            }, 1000);
        }
        if (paused) return

        if (pinchedMouse) {
            moveBufferX = mouseBaseSpeed * (1 - finger1.x)
            moveBufferY = mouseBaseSpeed * finger1.y
        }
        if (pinchedLeft) {
            if (!scrolling)
                timerLeft = setTimeout(() => {
                    // pressed left
                    goLeftDown()
                    timerLeft = null
                }, gesturesDelay)
        }
        if (unpinchedLeft) {
            if (!scrolling)
                if (timerLeft) {
                    clearTimeout(timerLeft)
                    // single left click
                    goLeftClick()
                } else {
                    goLeftUp()
                }
        }
        if (pinchedRight) {
            if (!scrolling)
                timerRight = setTimeout(() => {
                    // pressed right (lets do a double left click)
                    goDoubleLeft()
                    timerRight = null
                }, gesturesDelay)
        }
        if (unpinchedRight) {
            if (!scrolling)
                if (timerRight) {
                    clearTimeout(timerRight)
                    // single right click
                    goRightClick()
                } else {
                    goRightUp()
                }
        }

        move: if (statusMouse) {
            const xd = mouseBaseSpeed * (1 - finger1.x)
            const yd = mouseBaseSpeed * finger1.y
            let deltax = (moveBufferX - xd).toFixed(0)
            let deltay = (moveBufferY - yd).toFixed(0)
            if (Math.abs(deltax) == 1) deltax = 0
            if (Math.abs(deltay) == 1) deltay = 0
            if (deltax == 0 && deltay == 0) break move;
            if (Math.abs(deltax) < slowMoveThreshold) deltax *= slowMoveMod
            if (Math.abs(deltay) < slowMoveThreshold) deltay *= slowMoveMod
            if (Math.abs(deltax) > quickMoveThreshold) deltax *= quickMoveMod
            if (Math.abs(deltay) > quickMoveThreshold) deltay *= quickMoveMod
            goMoveMouse(deltax, deltay)
            moveBufferX = xd
            moveBufferY = yd
        }

        if (!scrolling && statusLeft && statusRight) {
            clearTimeout(timerLeft)
            clearTimeout(timerRight)
            goLeftUp()
            goRightUp()
            scrolling = true
            scrollBuffer = (mouseBaseSpeed * (1 - finger1.y))
        }

        if (scrolling) {
            const delta = scrollBuffer - (mouseBaseSpeed * (1 - finger1.y))
            goScroll(delta * scrollMultiplier)
            scrollBuffer = (mouseBaseSpeed * (1 - finger1.y))

            if (!statusLeft && !statusRight) {
                scrolling = false
            }
        }
    }
}

function pinchedFinger(rate) {
    let pinched = false
    return function (finger1, finger2) {
        if (Math.abs(finger1.x - finger2.x) < rate && Math.abs(finger1.y - finger2.y) < rate) {
            if (!pinched) {
                pinched = true
                return [true, false, pinched]
            }
        } else {
            if (pinched) {
                pinched = false
                return [false, true, pinched]
            }
        }
        return [false, false, pinched]
    }
}


// Spawn Go server
const pc = require('child_process').spawn(process.resourcesPath + '/handsserver', {
    cwd: process.cwd(),
    detached: true,
    stdio: "inherit"
})
// do something when app is closing
process.on('exit', () => {
    console.log('Exiting 1')
    pc.kill()
})
// catches ctrl+c event
process.on('SIGINT', () => {
    console.log('Exiting 2')
    pc.kill()
})
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', () => {
    console.log('Exiting 3')
    pc.kill()
})
process.on('SIGUSR2', () => {
    console.log('Exiting 4')
    pc.kill()
})


// WS
var WebSocketClient = require('websocket').client

var wsclient = new WebSocketClient()
let socket

wsclient.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString())
});

wsclient.on('connect', function (s) {
    socket = s
    console.log('WebSocket Client Connected')
    socket.on('error', function (error) {
        console.log("Connection Error: " + error.toString())
    });
    socket.on('close', function () {
        console.log('Connection Closed')
    });
});

setTimeout(() => {
    wsclient.connect('ws://localhost:8495/')
}, 2000);

const cmdMove = 0
const cmdRightClick = 1
const cmdLeftClick = 2
const cmdMiddleClick = 3
const cmdScroll = 4
const cmdDoubleLeft = 5
const cmdDoubleRight = 6
const cmdLeftDown = 7
const cmdLeftUp = 8
const cmdRightDown = 9
const cmdRightUp = 10

function goMoveMouse(_x, _y) {
    let x = parseInt(_x)
    let y = parseInt(_y)
    if (x > 127) x = 127
    else if (x < -127) x = -127
    if (y > 127) y = 127
    else if (y < -127) y = -127
    socket.sendBytes(Buffer.from([cmdMove, 127 + x, 127 + y]))
}

function goRightClick() {
    socket.sendBytes(Buffer.from([cmdRightClick]))
}

function goLeftClick() {
    socket.sendBytes(Buffer.from([cmdLeftClick]))
}

function goMiddleClick() {
    socket.sendBytes(Buffer.from([cmdMiddleClick]))
}

function goDoubleLeft() {
    socket.sendBytes(Buffer.from([cmdDoubleLeft]))
}

function goDoubleRight() {
    socket.sendBytes(Buffer.from([cmdDoubleRight]))
}

function goScroll(_x, _y) {
    let x = parseInt(_x)
    let y = parseInt(_y)
    if (x > 127) x = 127
    else if (x < -127) x = -127
    if (y > 127) y = 127
    else if (y < -127) y = -127
    socket.sendBytes(Buffer.from([cmdScroll, 127 + x, 127 + y]))
}

function goRightDown() {
    socket.sendBytes(Buffer.from([cmdRightDown]))
}

function goLeftDown() {
    socket.sendBytes(Buffer.from([cmdLeftDown]))
}

function goRightUp() {
    socket.sendBytes(Buffer.from([cmdRightUp]))
}

function goLeftUp() {
    socket.sendBytes(Buffer.from([cmdLeftUp]))
}