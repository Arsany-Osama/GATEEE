FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the backend code
COPY . .

# Expose the port the Express app will run on
EXPOSE 5000

# Start the production server
CMD ["node", "index.js"]
