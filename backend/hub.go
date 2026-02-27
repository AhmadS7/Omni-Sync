package main

import (
	"log"
	"sync"
)

// Hub maintains the set of active clients grouped by document "room".
// It acts as the central router for broadcasting CRDT and Presence updates.
type Hub struct {
	// Registered clients map across distinct document rooms.
	// Structure: map[roomName]map[*Client]bool
	rooms map[string]map[*Client]bool

	// Inbound messages to be broadcasted to clients in a particular room.
	broadcast chan Message

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	// Persistent store for Yjs updates.
	store *RedisStore

	// Mutex for concurrent room map access.
	mu sync.RWMutex
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
			h.mu.Lock()
			if h.rooms[client.room] == nil {
				h.rooms[client.room] = make(map[*Client]bool)
			}
			h.rooms[client.room][client] = true
			log.Printf("Client registered to room %s. Total clients: %d", client.room, len(h.rooms[client.room]))
			h.mu.Unlock()

			// Send existing persistence state down to the new client.
			go h.sendInitialState(client)

		case client := <-h.unregister:
			h.mu.Lock()
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
			h.mu.Unlock()

		case message := <-h.broadcast:
			// NOTE: Implementing y-websocket protocol broadly.
			// y-websocket has message types (0 = Sync, 1 = Awareness).
			// We sniff the first byte to see if it's a Sync update to persist it.
			if len(message.Data) > 0 {
				msgType := message.Data[0]
				// Type 0 is Sync. We are simplifying for brevity but ideally we parse the SyncStep here.
				// In a full implementation, we'd check if it's SyncStep2 or Update and then append.
				if msgType == 0 {
					// Async save to Redis to not block the broadcast loop.
					go func(room string, data []byte) {
						if err := h.store.AppendUpdate(room, data); err != nil {
							log.Printf("Redis AppendUpdate error: %v", err)
						}
					}(message.Room, message.Data)
				}
			}

			// Broadcast to all clients in the room except the sender
			h.mu.RLock()
			for client := range h.rooms[message.Room] {
				if client != message.Sender {
					select {
					case client.send <- message.Data:
					default:
						// Client's send channel is blocked, tear it down.
						close(client.send)
						delete(h.rooms[message.Room], client)
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

// sendInitialState reconstructs the CRDT log from Redis and sends it to the newly joined client.
func (h *Hub) sendInitialState(client *Client) {
	updates, err := h.store.GetUpdates(client.room)
	if err != nil {
		log.Printf("Failed to fetch initial state for room %s: %v", client.room, err)
		return
	}

	for _, update := range updates {
		client.send <- update
	}
	log.Printf("Sent %d update packets to client in room %s", len(updates), client.room)
}
