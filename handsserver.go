package main

import (
	"fmt"
	"net/http"

	"github.com/go-vgo/robotgo"
	"github.com/gorilla/websocket"
)

const SERVER = "127.0.0.1:8495"

const (
	cmdMove byte = iota
	cmdRightClick
	cmdLeftClick
	cmdMiddleClick
	cmdScroll
	cmdDoubleLeft
	cmdDoubleRight
	cmdLeftDown
	cmdLeftUp
	cmdRightDown
	cmdRightUp
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func main() {
	fmt.Println("Go server started")
	robotgo.MouseSleep = 1

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		conn, _ := upgrader.Upgrade(w, r, nil)
		fmt.Println("New WS connection")
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				panic(err)
			}
			handleMouseEvent(msg[0], msg[1:])
		}
	})

	err := http.ListenAndServe(SERVER, nil)
	if err != nil {
		panic(err)
	}
}

func handleMouseEvent(ev byte, args []byte) {
	switch ev {
	case cmdMove:
		x := 127 - int(args[0])
		y := 127 - int(args[1])
		robotgo.MoveRelative(x, y)
	case cmdLeftClick:
		robotgo.Click()
	case cmdRightClick:
		robotgo.Click("right")
	case cmdDoubleLeft:
		robotgo.Click("left", true)
	case cmdDoubleRight:
		robotgo.Click("right", true)
	case cmdMiddleClick:
		robotgo.Click("center")
	case cmdScroll:
		x := 127 - int(args[0])
		y := 127 - int(args[1])
		robotgo.ScrollRelative(x, y)
	case cmdLeftDown:
		robotgo.Toggle("left", "down")
	case cmdLeftUp:
		robotgo.Toggle("left")
	case cmdRightDown:
		robotgo.Toggle("right", "down")
	case cmdRightUp:
		robotgo.Toggle("right")
	}
}
