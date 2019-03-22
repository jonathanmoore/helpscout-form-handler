const fs = require('fs');
// HelpScout Mailbox API wrapper
const HelpScout = require('helpscout-2.0');
// Lodash util methods
const isEmpty = require('lodash/isEmpty');
const startCase = require('lodash/startCase');
const cloneDeep = require('lodash/cloneDeep');

// Initalize the HelpScout Mailbox API client using .env variables
const HelpScoutClient = new HelpScout({
  clientId: process.env.helpScoutClientId,
  clientSecret: process.env.helpScoutClientSecret,
});

/**
 * Mailbox API configuration
 * - mailboxId: find your ID by looking at the URL for the Help Scout inbox settings
 * - Custom Fields: for our use we are capturing the theme, store password and store URL
 *    as custom fields. This might be something different for your setup. You can find the
 *    IDs by inspecting the URL as your in the custom fields settings in HelpScout
 *
 * We're keeping the IDs in .env so that they're not publicly exposed in the repo
 */
const config = {
  // ID of Help Scout mailbox - found by inspecting the Help Scout settings URL
  mailboxId: process.env.mailboxId,
  // Custom field IDs - found by inspecting the Help Scout settings URL
  customFieldsId: {
    theme: process.env.customFieldTheme,
    storePassword: process.env.customFieldStorePassword,
    storeUrl: process.env.customFieldStoreUrl,
  },
};

async function createRequest(support) {
  /**
   * Support Customer
   * formatted for HelpScout Mail API
   * https://developer.helpscout.com/mailbox-api/endpoints/customers/create/
   *
   * - the simplest form of a customer is the email address
   * - HelpScout will use the email as an identifier to match to the right customers
   * - optionally if the first and last name values are submitted those will be
   *    added to the customer object
   */
  let customer = {
    email: support.email,
  };

  // Optional values
  if (support.firstName !== '') {
    customer.firstName = support.firstName;
  }
  if (support.lastName !== '') {
    customer.lastName = support.lastName;
  }

  /**
   * Support Conversation
   * formatted for HelpScout Mail API
   * https://developer.helpscout.com/mailbox-api/endpoints/conversations/create/
   * - create the conversation with the required fields, objects and arrays
   * - pass in HTML templates for notes
   * - add in submission data
   * - add in customer object
   */

  // Create an object of key/value pairs for the custom fields if they exist
  const storeInformation = {};
  if (support.theme !== '') {
    storeInformation.theme = support.theme;
  }
  if (support.storeUrl !== '') {
    storeInformation.storeURL = support.storeUrl;
  }
  if (support.storePassword !== '') {
    storeInformation.storePassword = support.storePassword;
  }
  // Adding additional customer information to the conversation notes
  // These templates loops throught the browser, location and storeInformation objects
  // to create table rows of information (if they exist)
  let noteHTML = `<h3 style="padding:0 0 5px 5px;">Customer Information</h3>
  <table cellpadding="5" cellspacing="2" style="margin-bottom: 16px">
    <tbody>
      ${Object.keys(support.browser)
        .map(
          key =>
            `<tr>
            <td valign="top" width="140">${startCase(key)}</td>
            <td valign="top">${support.browser[key]}</td>
          </tr>`
        )
        .join('')}
        ${Object.keys(support.location)
          .map(
            key =>
              `<tr>
            <td valign="top" width="140">${startCase(key)}</td>
            <td valign="top">${support.location[key]}</td>
          </tr>`
          )
          .join('')}
      <tr>
        <td valign="top" width="140">Submission ID</td>
        <td valign="top">
          <a href="${process.env.apiUrl}support/${support._id}">
            ${support._id}
          </a>
        </td>
      </tr>
    </tbody>
  </table>`;

  if (!isEmpty(storeInformation)) {
    noteHTML = `<h3 style="padding:0 0 5px 5px;">Store Information</h3>
    <table cellpadding="5" cellspacing="2" style="margin-bottom: 16px">
     <tbody>
      ${Object.keys(storeInformation)
        .map(
          key =>
            `<tr>
          <td valign="top" width="140">${startCase(key)}</td>
          <td valign="top">${storeInformation[key]}</td>
        </tr>`
        )
        .join('')}
     </tbody>
    </table>${noteHTML}`;
  }

  // Create the actual conversation
  let conversation = {
    customer: customer,
    mailboxId: config.mailboxId,
    type: 'email',
    status: 'active',
    subject: support.subject,
    threads: [
      {
        type: 'note',
        text: noteHTML,
      },
      {
        type: 'customer',
        customer: {
          email: customer.email,
        },
        text: support.message,
      },
    ],
    // tags: [],
    // Custom Fields - Inspect IDs from settings URLs
    fields: [],
  };

  // After the conversation obj is created add in attachments and custom fields if they exist
  if (support.file) {
    // clone the attachment data
    const attachment = cloneDeep(support.file);
    const file = support.filePath;
    const fileData = fs.readFileSync(file);
    // read the form uploaded file (formidable) and convert it to base64 for HelpScout
    attachment.data = fileData.toString('base64');
    // Update the conversation with the attachment obj
    // Currently a hack since things would fall apart if you try to upload multiple attachments
    conversation.threads[0].attachments = [attachment];
  }
  // If custom fields exist, pass them in
  if (support.theme !== '') {
    conversation.fields.push({
      id: config.customFieldsId.theme,
      value: support.theme,
    });
  }
  if (support.storeUrl !== '') {
    conversation.fields.push({
      id: config.customFieldsId.storeUrl,
      value: support.storeUrl,
    });
  }
  if (support.storePassword !== '') {
    conversation.fields.push({
      id: config.customFieldsId.storePassword,
      value: support.storePassword,
    });
  }

  // Create conversation in HelpScout
  // Wrapped in try/catch calls just in case HelpScout doesn't like what we throw at it
  try {
    // Create the conversation in HelpScout
    let newConversation = await HelpScoutClient.create(
      'conversations',
      conversation
    );
  } catch (err) {
    // Get the error HelpScout passed back when trying to create a conversation
    support.helpScoutResponse = JSON.parse(err.message);
    // Save the error data back into the db for lookup later
    support.save();

    // Create a new basic (should be fail proof) conversation to hit the inbox
    // with the error details. This is highly specific for our use and it should technically
    // be easier to update.
    let internal = {
      customer: {
        email: 'help@stylehatch.com',
      },
      mailboxId: config.mailboxId,
      type: 'email',
      status: 'active',
      subject: '⚠️ Internal: Support Form Submission Error',
      threads: [
        {
          type: 'customer',
          customer: {
            email: 'help@stylehatch.com',
          },
          text: `<p>Yikes! It looks like there was a problem with a form submission</p>
          <ul>
            <li>Email: ${support.email}</li>
            <li>ID: ${support._id}</li>
            <li>
              <a href="${process.env.apiUrl}support/${support._id}">
                API submission data
              </a>
            </li>
            <h3>API Data</h3>
            <pre>${JSON.stringify(support, null, 1)}</pre>`,
        },
      ],
    };
    try {
      // If something goes wrong with the backup... we might be in trouble
      let internalConversation = await HelpScoutClient.create(
        'conversations',
        internal
      );
    } catch (err) {
      // If you're seeing this, then more than likely there is a problem with the HelpScout key/secret
      console.log('Yikes! This must be bad.', err);
    }
  }
}

module.exports.createRequest = createRequest;
