const express = require('express');
const app = express();
const formidableMiddleware = require('express-formidable');
const mongoose = require('mongoose');

// Load in environment variables
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

// Import routes
const apiRoutes = require('./api-routes');

// Configure bodyparser to handle post requests
app.use(formidableMiddleware());

// Use mongo env URL or localhost for testing
const mongodbUri = process.env.MONGODB_URI || 'mongodb://localhost/support';

// Connect to Mongoose and set connection variable
mongoose.connect(mongodbUri, {useNewUrlParser: true});

// Create Mongo DB connection
const db = mongoose.connection;
// Setup server port
const port = process.env.PORT;

// Send message for default URL
app.use('/', apiRoutes);

// Launch app to listen to specified port
app.listen(port, function() {
  console.log('Running HelpScout Support Form on port ' + port);
});
