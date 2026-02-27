package main

import (
	"flag"
	"log"
	"net/http"
)

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
	// The document ID is parsed from the URL, e.g., /sync/playbook-123
	room := r.URL.Path[len("/sync/"):]

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{hub: hub, conn: conn, send: make(chan []byte, 256), room: room}
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

func main() {
	addr := flag.String("addr", ":8080", "http service address")
	redisAddr := flag.String("redis", "localhost:6379", "redis connection string")
	flag.Parse()

	store := NewRedisStore(*redisAddr)
	hub := NewHub(store)
	go hub.Run()

	http.HandleFunc("/sync/", func(w http.ResponseWriter, r *http.Request) {
		serveWs(hub, w, r)
	})

	http.HandleFunc("/logs/", func(w http.ResponseWriter, r *http.Request) {
		serveLogs(w, r)
	})

	log.Printf("Omni-Sync Signaling Server starting on %s", *addr)
	log.Printf("Redis Connection established on %s", *redisAddr)
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
}
