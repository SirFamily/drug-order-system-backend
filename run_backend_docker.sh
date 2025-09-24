bash
  #!/bin/bash

  # --- Configuration ---
  # Replace with your actual database URL from your backend\'s .env file
  DB_URL="mysql://root:448518@45.91.134.79:4001/drug_order_system"

  # Replace with your actual JWT secret from your backend\'s .env file
  JWT_SECRET="time_is_money_123"

  # Replace with your frontend\'s origin URL from your backend\'s .env file
  CORS_ORIGIN="https://drug-order-system.vercel.app"

  # --- Docker Command ---
  echo "Building Docker image..."
  docker build -t drug-order-system-backend:latest .

  echo "Running Docker container..."
  docker run -p 5001:5001 \
    -e DATABASE_URL="${DB_URL}" \
    -e JWT_SECRET="${JWT_SECRET}" \
    -e CORS_ORIGIN="${CORS_ORIGIN}" \
    drug-order-system-backend:latest