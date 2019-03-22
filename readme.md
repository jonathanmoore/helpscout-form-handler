# Help Scout - Mailbox API Form Handler

Basic Node, Express and Mongo application to handle form custom form submissions to Help Scout's [Mailbox API 2.0](https://developer.helpscout.com/mailbox-api/). Currently Help Scout's support form is not customizable, and if you need to add additional form fields your only option is to roll your own solution. This repo is very specific for our needs at Style Hatch for Shopify premium theme support, however the code is well documented to give you a good starting point.

- Handle form submissions to the API URL
- Validate the fields for Help Scout required, as well as custom options for our use
- Save the form submission data to a Mongo database for backup
- Accept file uploads and convert to base64 data for Help Scout
- Get customer information like browser details and location for a note
- Attempt to send customer and coversation data to Help Scout
- Errors are logged in the database and a simple internal conversation is created in Help Scout with the details
- Basic form for testing available at http://localhost:8080/form

## Getting Started

Requirements node.js (stable - 11.12.0), MongoDB, and Yarn (our prefered package manager)

1. Create a [Help Scout application](https://developer.helpscout.com/mailbox-api/overview/authentication/) for the app id and secret
2. Rename `.env.example` to `.env` for environment variables
3. Add Help Scout id and secret to `.env`
4. Login to your Help Scout inbox, and edit the mailbox settings. In the URL you will find the Mailbox id `/settings/mailbox/000000` to add to `.env`
5. If you are using Custom Fields, edit the fields in the Help Scout admin to find the field ids for `.env`
6. Run `yarn install && yarn start`
7. Open http://localhost:8080/form to test the submissions
