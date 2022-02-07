package game

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

var manager = newRoomManager()

func handleWebsocket(c *gin.Context) {
	w, r := c.Writer, c.Request
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %+v", err)
		return
	}
	comm := communicator{conn}
	p := &player{Conn: conn}
	var code string

	defer conn.Close()
	defer func() {
		manager.RemovePlayer(p, code)
	}()

awaitGame:
	// wait for connection to join or create a game room
	code = ""
	for code == "" {
		msg, err := comm.receive()
		if err != nil {
			fmt.Println(err)
			return
		}

		if msg.Cmd == "JOIN" {
			if msg.Args[0] == "" {
				comm.send("DENY", "no room code provided")
				continue
			}
			if err = manager.AddPlayer(p, msg.Args[0]); err != nil {
				comm.send("DENY", err.Error())
				continue
			}
			code = msg.Args[0]
		} else if msg.Cmd == "CREATE" {
			code = manager.CreateRoom(manageGame)
			if err = manager.AddPlayer(p, code); err != nil {
				manager.RemoveRoom(code)
				comm.send("DENY", err.Error())
				code = ""
			}
		}
	}

	// wait for game room code acknowledgement
	for {
		comm.send("CODE", code)
		msg, err := comm.receive()
		if err != nil {
			fmt.Println(err)
			return
		}

		if msg.Cmd == "OK" {
			break
		}
	}

	room := manager.get(code)
	if room.Started {
		p.ch <- &message{Cmd: "UPDATE"}
	}

	for {
		msg, err := comm.receive()
		if err != nil {
			fmt.Println(err)
			return
		}

		if room.Started {
			p.ch <- msg
		} else if msg.Cmd != "QUIT" {
			comm.send("ERROR", "game hasn't started yet")
		}
		if msg.Cmd == "QUIT" {
			break
		}
	}

	manager.RemovePlayer(p, code)
	goto awaitGame
}

func Route(router *gin.RouterGroup) {
	router.GET("", handleWebsocket)
}
