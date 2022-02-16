const { app, BrowserWindow, ipcMain } = require('electron')
const robot = require('robotjs');
const path = require('path');

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


// ROBOT.js
const slowMoveMod = 0.5
const slowMoveThreshold = 6
const mouseBaseSpeed = 0.8
const quickMoveMod = 3
const quickMoveThreshold = 25
const heightModifier = 1.3 // it's way easier for us to move hand horizontally than vertically
const gesturesDelay = 300
const scrollMultiplier = 2

var screenSize = robot.getScreenSize();
var height = screenSize.height * mouseBaseSpeed * heightModifier;
var width = screenSize.width * mouseBaseSpeed;
let scrolling = false

const pinchedMousef = pinchedFinger(0.03)
const pinchedLeftf = pinchedFinger(0.03)
const pinchedRightf = pinchedFinger(0.02)
let timerLeft, timerRight
let scrollBuffer = 0
let moveBufferX = 0
let moveBufferY = 0

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

        if (!finger5 || !finger1) return
        if (finger5.x > finger1.x) return

        const [pinchedMouse, unpinchedMouse, statusMouse] = pinchedMousef(finger1, finger2)
        const [pinchedLeft, unpinchedLeft, statusLeft] = pinchedLeftf(finger1, finger3)
        const [pinchedRight, unpinchedRight, statusRight] = pinchedRightf(finger1, finger4)

        if (pinchedMouse) {
            moveBufferX = width * (1 - finger1.x)
            moveBufferY = height * finger1.y
        }
        if (pinchedLeft) {
            if (!scrolling)
                timerLeft = setTimeout(() => {
                    // pressed left
                    robot.mouseToggle('down', 'left')
                    timerLeft = null
                }, gesturesDelay)
        }
        if (unpinchedLeft) {
            if (!scrolling)
                if (timerLeft) {
                    clearTimeout(timerLeft)
                    // single left click
                    robot.mouseClick('left')
                } else {
                    robot.mouseToggle('up', 'left')
                }
        }
        if (pinchedRight) {
            if (!scrolling)
                timerRight = setTimeout(() => {
                    // pressed right (lets do a double left click)
                    robot.mouseClick('left', true)
                    timerRight = null
                }, gesturesDelay)
        }
        if (unpinchedRight) {
            if (!scrolling)
                if (timerRight) {
                    clearTimeout(timerRight)
                    // single right click
                    robot.mouseClick('right')
                } else {
                    robot.mouseToggle('up', 'right')
                }
        }

        move: if (statusMouse) {
            const { x, y } = robot.getMousePos();
            const xd = width * (1 - finger1.x)
            const yd = height * finger1.y
            let deltax = (moveBufferX - xd).toFixed(0)
            let deltay = (moveBufferY - yd).toFixed(0)
            if (Math.abs(deltax) == 1) deltax = 0
            if (Math.abs(deltay) == 1) deltay = 0
            if (deltax == 0 && deltay == 0) break move;
            if (Math.abs(deltax) < slowMoveThreshold) deltax *= slowMoveMod
            if (Math.abs(deltay) < slowMoveThreshold) deltay *= slowMoveMod
            if (Math.abs(deltax) > quickMoveThreshold) deltax *= quickMoveMod
            if (Math.abs(deltay) > quickMoveThreshold) deltay *= quickMoveMod
            robot.moveMouse(x - deltax, y - deltay);
            moveBufferX = xd
            moveBufferY = yd
        }

        if (!scrolling && statusLeft && statusRight) {
            clearTimeout(timerLeft)
            clearTimeout(timerRight)
            robot.mouseToggle('up', 'left')
            robot.mouseToggle('up', 'right')
            scrolling = true
            scrollBuffer = (height * (1 - finger1.y))
        }

        if (scrolling) {
            const delta = scrollBuffer - (height * (1 - finger1.y))
            robot.scrollMouse(0, delta * scrollMultiplier)
            scrollBuffer = (height * (1 - finger1.y))

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