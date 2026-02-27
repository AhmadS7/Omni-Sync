package main

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// serveLogs handles the /logs/{podName} endpoint.
// It simulates tailing standard output of a Kubernetes pod by emitting realistic log lines.
func serveLogs(w http.ResponseWriter, r *http.Request) {
	podName := r.URL.Path[len("/logs/"):]

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	defer conn.Close()

	log.Printf("Started streaming K8s logs for pod: %s", podName)

	ticker := time.NewTicker(800 * time.Millisecond)
	defer ticker.Stop()

	// Initial burst
	initialLogs := []string{
		fmt.Sprintf("[INFO] Pod %s starting up...", podName),
		fmt.Sprintf("[INFO] Loading configuration from configmap/app-settings"),
		fmt.Sprintf("[INFO] Connecting to database cluster..."),
		fmt.Sprintf("[INFO] Database connection established (15ms)."),
		fmt.Sprintf("[INFO] Listening on 0.0.0.0:8080"),
	}

	for _, msg := range initialLogs {
		if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
			return
		}
		time.Sleep(100 * time.Millisecond)
	}

	tickCount := 0
	for {
		<-ticker.C
		tickCount++

		var msg string
		if tickCount%7 == 0 {
			msg = fmt.Sprintf("[WARN] Pod %s: Memory usage exceeded 70%% threshold (2.1GB/3GB).", podName)
		} else if tickCount%15 == 0 {
			msg = fmt.Sprintf("[ERROR] Pod %s: Connection timeout writing to downstream service redis-cache.", podName)
		} else {
			msg = fmt.Sprintf("[INFO] Pod %s: Processed incoming HTTP request GET /api/v1/healthz (200 OK) %vms", podName, tickCount%10)
		}

		conn.SetWriteDeadline(time.Now().Add(writeWait))
		if err := conn.WriteMessage(websocket.TextMessage, []byte(msg)); err != nil {
			return
		}
	}
}
