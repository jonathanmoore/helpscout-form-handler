const router = require('express').Router();
const path = require('path');

// Set default API response
router.get('/v1/', function(req, res) {
  res.json({
    status: 'success',
    message: 'Style Hatch API',
  });
});

// Import contact controller
const supportController = require('./supportController');

// POST route for form submissions
router.route('/v1/support').post(supportController.new);
// Get the full index list of all submissions only in development env
if (process.env.NODE_ENV === 'development') {
  router.route('/v1/support').get(supportController.index);
}

// Get individual support requests by the db _id
router.route('/v1/support/:support_id').get(supportController.view);

// Temporary, quick-and-dirty form for testing submissions
router.get('/form', function(req, res) {
  res.sendFile(path.join(__dirname + '/form.html'));
});

// Wildcard '404'
router.get('*', function(req, res) {
  res.json({
    status: 'error',
    message: 'Invalid API enpoint',
  });
});

// Export API routes
module.exports = router;
