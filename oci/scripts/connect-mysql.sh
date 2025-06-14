#!/bin/bash

# Load environment variables
if [ -f "../.env" ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
else
    echo "Error: .env file not found in parent directory"
    exit 1
fi

# Check required variables
if [ -z "$OCI_BASTION_SESSION_ID" ] || [ -z "$OCI_BASTION_HOST" ] || [ -z "$MYSQL_HOST" ]; then
    echo "Error: Required environment variables are not set"
    echo "Please check your .env file"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "Closing SSH tunnel..."
    if [ ! -z "$SSH_PID" ]; then
        kill $SSH_PID 2>/dev/null
    fi
}
trap cleanup EXIT

echo "Establishing SSH tunnel through OCI Bastion..."
echo "Bastion Host: $OCI_BASTION_HOST"
echo "MySQL Host: $MYSQL_HOST:$MYSQL_PORT"
echo "Local Port: $LOCAL_MYSQL_PORT"

# Create SSH tunnel
ssh -N -L ${LOCAL_MYSQL_PORT}:${MYSQL_HOST}:${MYSQL_PORT} \
    -p 22 \
    -i ${SSH_PRIVATE_KEY_PATH} \
    ${OCI_BASTION_USERNAME}@${OCI_BASTION_HOST} &

SSH_PID=$!

# Wait for tunnel to establish
sleep 3

# Check if tunnel is running
if ! ps -p $SSH_PID > /dev/null; then
    echo "Error: Failed to establish SSH tunnel"
    exit 1
fi

echo "SSH tunnel established successfully!"
echo ""
echo "You can now connect to MySQL using:"
echo "  Host: localhost"
echo "  Port: $LOCAL_MYSQL_PORT"
echo "  User: $MYSQL_USER"
echo "  Database: $MYSQL_DATABASE"
echo ""
echo "Example connection:"
echo "  mysql -h localhost -P $LOCAL_MYSQL_PORT -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE"
echo ""
echo "Press Ctrl+C to close the tunnel"

# Keep the script running
wait $SSH_PID