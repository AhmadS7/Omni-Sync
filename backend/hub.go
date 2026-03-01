package main

import (
	"errors"
	"log"
)

// readVarUint decodes a variable-length unsigned integer from a byte slice.
func readVarUint(data []byte, offset int) (uint, int, error) {
	var num uint = 0
	var mult uint = 1
	var length int = 0
	for {
		if offset >= len(data) {
			return 0, 0, errors.New("EOF")
		}
		r := data[offset]
		offset++
		num = num + uint(r&127)*mult
		mult *= 128
		length++
		if r < 128 {
			return num, offset, nil
		}
		if length > 9 {
			return 0, 0, errors.New("invalid varuint format")
		}
	}
}

// Hub maintains the set of active clients grouped by document "room".
// It acts as the central router for broadcasting CRDT and Presence updates.
type Hub struct {
	// Registered clients map across distinct document rooms.
	// Structure: map[string]map[*Client]bool
	rooms map[string]map[*Client]bool

	// Inbound messages to be broadcasted to clients in a particular room.
	broadcast chan Message

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// Persistent store for Yjs updates.
	store *RedisStore
}

// Message represents a payload from a client intended for a specific document.
type Message struct {
	Room   string
	Data   []byte
	Sender *Client
}

// NewHub initializes and returns a new Hub instance alongside its dependencies.
func NewHub(store *RedisStore) *Hub {
	return &Hub{
		broadcast:  make(chan Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		rooms:      make(map[string]map[*Client]bool),
		store:      store,
	}
}

// Run starts the core event loop that processes registrations and broadcasting safely.
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			if h.rooms[client.room] == nil {
				h.rooms[client.room] = make(map[*Client]bool)
			}
			h.rooms[client.room][client] = true
			log.Printf("Client registered to room %s. Total clients: %d", client.room, len(h.rooms[client.room]))

			// Send existing persistence state down to the new client.
			go h.sendInitialState(client)

		case client := <-h.unregister:
			if clients, ok := h.rooms[client.room]; ok {
				if _, ok := clients[client]; ok {
					delete(clients, client)
					close(client.send)
					log.Printf("Client unregistered from room %s. Remaining clients: %d", client.room, len(h.rooms[client.room]))
					if len(clients) == 0 {
						delete(h.rooms, client.room)
						log.Printf("Room %s is empty and removed.", client.room)
					}
				}
			}

		case message := <-h.broadcast:
			// NOTE: Implementing y-websocket protocol broadly.
			// y-websocket has message types (0 = Sync, 1 = Awareness).
			// We sniff the first byte to see if it's a Sync update to persist it.
			if len(message.Data) > 0 {
				msgType, offset, err := readVarUint(message.Data, 0)
				if err == nil && msgType == 0 { // Type 0 is Sync
					syncType, _, err := readVarUint(message.Data, offset)
					// In a full implementation, we'd check if it's SyncStep2 (1) or Update (2) and then append.
					if err == nil && (syncType == 1 || syncType == 2) {
						// Async save to Redis to not block the broadcast loop.
						go func(room string, data []byte) {
							if err := h.store.AppendUpdate(room, data); err != nil {
								log.Printf("Redis AppendUpdate error: %v", err)
							}
						}(message.Room, message.Data)
					}
				}
			}

			// Broadcast to all clients in the room except the sender
			for client := range h.rooms[message.Room] {
				if client != message.Sender {
					select {
					case client.send <- message.Data:
					default:
						// Client's send channel is blocked.
						// Unregister will be handled by readPump failing.
						// Just remove them from the room for now.
						delete(h.rooms[message.Room], client)
					}
				}
			}
		}
	}
}

// sendInitialState reconstructs the CRDT log from Redis and sends it to the newly joined client.
func (h *Hub) sendInitialState(client *Client) {
	defer func() {
		// Recover from panic if the client disconnected and client.send was closed
		if r := recover(); r != nil {
			log.Printf("Recovered from panic in sendInitialState: %v", r)
		}
	}()

	updates, err := h.store.GetUpdates(client.room)
	if err != nil {
		log.Printf("Failed to fetch initial state for room %s: %v", client.room, err)
		return
	}

	for _, update := range updates {
		client.send <- update // This could panic if client disconnected quickly
	}
	log.Printf("Sent %d update packets to client in room %s", len(updates), client.room)
}
