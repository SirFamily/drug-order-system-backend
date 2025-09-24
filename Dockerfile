# Use an official Node.js runtime as a parent image
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
# This allows us to install dependencies first, leveraging Docker's cache
COPY package*.json ./

# Install app dependencies
# Use npm ci for clean installs in CI/CD environments
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy the rest of the application code to the container
COPY . .

# Expose the port the app runs on
EXPOSE 5001

# Define the command to run the app
CMD ["npm", "start"]
