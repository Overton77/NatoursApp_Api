## API Documentation

### Postman Collection

A Postman collection is available for testing the Natours API. You can find the collection JSON file [here](natours_postman_collection.json).

#### Importing the Postman Collection

1. Download the `Natours_API.postman_collection.json` file.
2. Open Postman.
3. Click the `Import` button in the top-left corner.
4. Select `Choose Files` and import the downloaded JSON file.

This collection includes all the available endpoints, their parameters, and example requests and responses.

### Live Postman Documentation

You can also view the live Postman documentation [here](https://documenter.getpostman.com/view/29523020/2s9YyqjNTE).

This link provides an online, interactive view of the API documentation, making it easy to explore and understand the available endpoints.

# Natours Application

This repository contains the Natours application, which is a complete tour booking platform built with Node.js. The application features both server-side rendered Pug templates for the front end and a RESTful API accessible per resource per route.

## Getting Started

### Environment Configuration

To run this application, you will need to set up several environment variables. Create a `.env` file in the root of your project with the following placeholders:

```env
# Environment configuration
NODE_ENV=development
PORT=3000

# Database configuration
DATABASE_PASSWORD=your_database_password
DATABASE_LOCAL=mongodb://localhost:27017/your_database_name
DATABASE=mongodb+srv://your_username:<PASSWORD>@cluster0.7fguem0.mongodb.net/natours?retryWrites=true&w=majority

# JWT configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=90d
JWT_COOKIE_EXPIRES_IN=90

# Email configuration
EMAIL_USERNAME=your_email_username
EMAIL_PASSWORD=your_email_password
EMAIL_HOST=your_email_host
EMAIL_PORT=your_email_port
EMAIL_FROM=your_email_from

# SendGrid configuration
SEND_GRID_API=your_sendgrid_api_key
SEND_GRID_USERNAME=your_sendgrid_username
SEND_GRID_SERVER=your_sendgrid_server
SEND_GRID_PORT=your_sendgrid_port

# Stripe configuration
STRIPE_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Instructions to use it locally.

1. Clone the Repsitory
   git clone https://github.com/yourusername/natours-api.git

2. Run `npm install`

--SEEDING THE DATABASE--

3. To seed the MongoDB database with sample data, use the command line script provided in dev-data/data/import-dev-data.js. To import data
   in your command line within the root run `node dev-data/data/import-dev-data --import`  
   To delete the data in your command line run `node dev-data/data/import-dev-data --delete`

4. Run `npm run build-and-start`. `npm run build-and-start` is akin to running npm run build:js and then npm run start || npm run watch:js and then npm run start

5. Stripe Webhook: Stripe webhooks can be tested locally utilizing the command line. Use brew, scoop or another package manager to install the stripe-cli. Create
   an endpoint within your stripe dashboard in the webhooks section to match the applicational end point to create bookings in the database when a payment is executed. `http://localhost:3000/api/v1/bookings/stripe-webhook` is where the webhook currently goes.

Features--
User Authentication: Users can log in with hardcoded values from the database (e.g., edu@example.com and test1234).
Tour Navigation: Users can navigate different tours.
Tour Maps: Users can see the tours on a map.
User Settings: Users can update their settings, including multimedia.
Bookings: Users can see the tours they have booked.
Tour Locations: Users can see tour locations on a map.

Planned Features--
Sign Up Feature: Allow users to sign up.
Like Feature: Allow users to like tours.
Review System: Allow users to leave reviews.
Enhanced Tour Search: Add more granularity to tour searching.
