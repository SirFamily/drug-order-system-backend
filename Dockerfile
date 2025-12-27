# 1. Base Image
FROM node:18-alpine

# 2. Set working directory
WORKDIR /usr/src/app

# 3. Copy dependency files
COPY package*.json ./

# 4. Install dependencies using NPM
RUN npm install

# 5. Copy Prisma schema
COPY prisma ./prisma/

# 6. Generate Prisma Client
# This step is crucial for the app to connect to the database
RUN npx prisma generate

# 7. Copy application source code
COPY . .

# 8. Expose the port the app runs on
EXPOSE 5001

# 9. Command to run the application
CMD [ "node", "index.js" ]