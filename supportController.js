// DB schema
const Support = require('./supportModel');
// HelpScout Mail API wrapper
const HelpScout = require('./helpscoutController');

// Helper moduels
const browser = require('browser-detect');
const requestIp = require('request-ip');
const geoip = require('geoip-lite');

const isEmail = require('validator/lib/isEmail');
const isURL = require('validator/lib/isURL');

// Lodash util methods
const assign = require('lodash/assign');
const defaults = require('lodash/defaults');
const startCase = require('lodash/startCase');
const startsWith = require('lodash/startsWith');
const trim = require('lodash/trim');

// Handle index actions
exports.index = function(req, res) {
  Support.get(function(err, support) {
    if (err) {
      res.json({
        status: 'error',
        message: err,
      });
    }

    res.json({
      status: 'success',
      message: 'Support requests retrieved successfully',
      data: support,
    });
  });
};

// New actions for POST
exports.new = function(req, res) {
  // Create new support object
  let support = new Support();

  // Assign the values of the field to the support object
  assign(support, req.fields);
  // Provide default support values for missing items
  defaults(support, {
    firstName: '',
    lastName: '',
    email: '',
    storeUrl: '',
    storePassword: '',
    theme: '',
    subject: '',
    message: '',
    browser: {},
    location: {},
  });

  // Trim specific input fields
  support.firstName = trim(support.firstName);
  support.lastName = trim(support.lastName);
  support.email = trim(support.email);
  support.storeUrl = trim(support.storeUrl);
  support.storePassword = trim(support.storePassword);
  support.theme = trim(support.theme);
  support.subject = trim(support.subject);

  /**
   * Browser data
   */
  // Get the browser details and pass it along for the DB and HelpScout calls
  const userBrowser = browser(req.headers['user-agent']);
  // Set mobile value
  if (userBrowser.mobile) {
    userBrowser.device = 'Mobile';
  } else {
    userBrowser.device = 'Desktop';
  }
  if (userBrowser) {
    // key/values are looped through for HelpScout notes
    support.browser = {
      operatingSystem: userBrowser.os,
      browserVersion: `${startCase(userBrowser.name)} ${userBrowser.version}`,
      device: userBrowser.device,
    };
  }

  /**
   * Location data
   */
  // Attempt to get location by IP address
  let clientIp = requestIp.getClientIp(req);
  // During development use a testing IP
  if (process.env.NODE_ENV === 'development') {
    clientIp = '192.211.59.138';
  }
  // Loopup location by IP
  const userLocation = geoip.lookup(clientIp);
  if (userLocation) {
    // key/values looped through for HelpScout notes
    support.location = {
      ipAddres: clientIp,
      location: `${userLocation.city}, ${userLocation.region} ${
        userLocation.country
      }`,
      timeZone: `${userLocation.timezone}`,
    };
  }

  /**
   * File attachment
   */
  // Add attachment file if it exists
  const attachment = req.files.attachment;
  if (attachment.size) {
    // Intitially use an empty base64 data value
    // Throwing a large base64 data value at the db isn't a great idea
    support.file = {
      fileName: attachment.name,
      mimeType: attachment.type,
      data: 'ZmlsZQ==',
    };
    // Seperate file path to the temporary file. Convert this to base64 in helpscoutController
    support.filePath = attachment.path;
  }

  /**
   * Error Handling
   * - check required fields
   * - if there's a problem add the list item error
   * - push to the error fields array for highlighting on the front end
   */
  // Generate error messages based on email and message
  let errorMessage = '';
  let errorFields = [];

  // Email
  if (support.email === '') {
    errorMessage = `${errorMessage}<li>Email address required.</li>`;
    errorFields.push('email');
  } else if (!isEmail(support.email)) {
    errorMessage = `${errorMessage}<li>Invalid email address.</li>`;
    errorFields.push('email');
  }

  // Subject
  if (support.subject === '') {
    errorMessage = `${errorMessage}<li>Subject required.</li>`;
    errorFields.push('subject');
  }

  // Message
  if (support.message === '') {
    errorMessage = `${errorMessage}<li>Message required.</li>`;
    errorFields.push('message');
  }

  // Store URL
  if (support.storeUrl !== '') {
    // Check for http (for http:// and https://) and add it if missing
    if (!startsWith(support.storeUrl, 'http')) {
      support.storeUrl = `https://${support.storeUrl}`;
    }
    // Then validate URL
    if (!isURL(support.storeUrl)) {
      errorMessage = `${errorMessage}<li>Invalid URL</li>`;
      errorFields.push('storeUrl');
    }
  }

  // File attachment
  if (attachment.size) {
    // Make sure file is under 10MB limit set by HelpScout Mailbox API
    fileLimitMb = 10;
    fileSizeMb = attachment.size / 1024 / 1000;
    if (fileSizeMb > fileLimitMb) {
      errorMessage = `${errorMessage}<li>File size is too large. Upload limit 10MB.</li>`;
      errorFields.push('attachment');
    }
  }

  // If there is an error return the JSON to stop further processing
  if (errorFields.length > 0) {
    return res.status(400).json({
      status: 'error',
      message: `<ul>${errorMessage}</ul>`,
      data: {
        fields: errorFields,
      },
    });
  }

  /**
   * Save all the details to the DB
   *
   * Having a backup of the submissions is a good idea incase something goes wrong with
   * the HelpScout API call. In helpscoutController any errors are caught and added
   * to the db.
   */
  support.save(function(err) {
    if (err) res.json(err);

    res.json({
      status: 'success',
      message: 'New support request submitted.',
      data: support,
    });
  });

  /**
   * HelpScout API call
   * - pass along the entire support object
   */
  HelpScout.createRequest(support);
};

// View support submission by ID
exports.view = function(req, res) {
  Support.findById(req.params.support_id, function(err, support) {
    if (err) res.send(err);

    res.json({
      status: 'success',
      message: 'Support request loading...',
      data: support,
    });
  });
};
