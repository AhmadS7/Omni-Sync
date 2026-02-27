package main

import (
	"context"
	"fmt"
	"log"

	"github.com/redis/go-redis/v9"
)

// RedisStore handles persistent storage operations for Yjs CRDT binary updates.
// It interfaces with a Redis instance to maintain an append-only log of document changes.
type RedisStore struct {
	client *redis.Client
}

var ctx = context.Background()

// NewRedisStore initializes a new connection to the Redis backend.
func NewRedisStore(addr string) *RedisStore {
	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	// Verify connection
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Fatalf("Fatal: Could not connect to Redis at %s: %v", addr, err)
	}
	log.Printf("Connected to Redis at %s", addr)

	return &RedisStore{
		client: rdb,
	}
}

// AppendUpdate adds a Yjs binary update payload to a document's history list.
// The list format ensures monotonicity is preserved as updates arrive serially.
func (rs *RedisStore) AppendUpdate(room string, update []byte) error {
	key := fmt.Sprintf("yjs:doc:%s", room)
	// RPUSH adds the binary blob to the tail of the list.
	return rs.client.RPush(ctx, key, update).Err()
}

// GetUpdates retrieves all historical Yjs binary updates for a specific document.
// This is used to reconstitute the CRDT state when a client first connects or the server restarts.
func (rs *RedisStore) GetUpdates(room string) ([][]byte, error) {
	key := fmt.Sprintf("yjs:doc:%s", room)
	cmd := rs.client.LRange(ctx, key, 0, -1)
	if cmd.Err() != nil {
		return nil, cmd.Err()
	}
	
	strings := cmd.Val()
	var updates [][]byte
	for _, s := range strings {
		updates = append(updates, []byte(s))
	}
	return updates, nil
}
