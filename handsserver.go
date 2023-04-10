package main

import (
	"fmt"
	"net/http"
	"runtime"

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

type Event struct {
	Event byte
	Args  []byte
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func main() {
	runtime.LockOSThread()

	var events = make(chan Event)
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
			events <- Event{msg[0], msg[1:]}
		}
	})

	go http.ListenAndServe(SERVER, nil)
	handleMouseEvents(events)
}

func handleMouseEvents(recv chan Event) {
	for {
		ev := <-recv
		switch ev.Event {
		case cmdMove:
			x := 127 - int(ev.Args[0])
			y := 127 - int(ev.Args[1])
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
			x := 127 - int(ev.Args[0])
			y := 127 - int(ev.Args[1])
			robotgo.ScrollSmooth(y, 1, 1, x)
		case cmdLeftDown:
			robotgo.Toggle("left", "down")
		case cmdLeftUp:
			robotgo.Toggle("left", "up")
		case cmdRightDown:
			robotgo.Toggle("right", "down")
		case cmdRightUp:
			robotgo.Toggle("right", "up")
		}
	}
}
