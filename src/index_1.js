require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const ticket = require('./ticket');
const signature = require('./verifySignature');
const debug = require('debug')('slash-command-template:index');
const confirmation = require('./confirmation');
const exportNote = require('./exportNote');
const apiUrl = 'https://slack.com/api';

const app = express();

/*
 * Parse application/x-www-form-urlencoded && application/json
 * Use body-parser's `verify` callback to export a parsed raw body
 * that you need to use to verify the signature
 */

const rawBodyBuffer = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
    console.log(req.rawBody)
	console.log('I am parsing the body!')
   console.log()
	console.log()
  var rawBod = req.rawBody  
 } else if (rawBod != req.rawBody) {
	req.rawBody = buf.toString(encoding || 'utf8');
    console.log(req.rawBody)
        console.log('I am parsing the response body!')
 }
};

app.use(bodyParser.urlencoded({verify: rawBodyBuffer, extended: true }));
app.use(bodyParser.json({ verify: rawBodyBuffer }));
//app.use(bodyParser.urlencoded({verify: secondBodyBuffer, extended: true }));
//app.use(bodyParser.json({ verify: secondBodyBuffer }));

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

/*
 * Endpoint to receive /helpdesk slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/command', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;
  console.log('I gt the trigger');
  console.log(trigger_id);
  console.log('this is the request')
  console.log(req.body) 
  // Verify the signing secret
  if (signature.isVerified(req)) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: 'Submit a helpdesk ticket',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [
	         {
            label: 'Title',
            type: 'text',
            name: 'title',
            value: text,
            hint: '30 second summary of the problem',
          },
          {
            label: 'Description',
            type: 'textarea',
            name: 'description',
            optional: true,
          },
          {
            label: 'Urgency',
            type: 'select',
            name: 'urgency',
            options: [
              { label: 'Low', value: 'Low' },
              { label: 'Medium (Default)', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
        ],
      }),
    };

    // open the dialog by calling dialogs.open method and sending the payload
    //   	const promise = axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialog));
    //	console.log(promise)
    //	return promise;
    
    axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
     .then((result) => {
      console.log('Sending the payload');
      console.log(dialog);
        // debug('dialog.open: %o', result.data);
        res.send('');
	// }).catch((err) => {
        // debug('dialog.open call failed: %o', err);
        // res.sendStatus(500);
       });
  	 } else if (type === "dialog_submission") {
        // immediately respond with a empty 200 response to let
         // Slack know the command was received
        console.log('Dialog Submitted')
        res.send('');
        // create a ClipIt and prepare to export it to the theoritical external app
        exportNote.exportToJson(user.id, submission);
        // DM the user a confirmation message
        confirmation.sendConfirmation(user.id, submission);
        } else {
   	debug('Verification token mismatch');
 	console.log('unverified');
	res.sendStatus(404);
 	}});


/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a Helpdesk ticket
 */
app.post('/interactive', (req, res) => {
  const body = JSON.parse(req.body.payload);
 console.log('I am here')
 console.log(body)
  // check that the verification token matches expected value
  if (signature.isVerified(req)) {
    debug(`Form submission received: ${body.submission.trigger_id}`);
    console.log('Made the submission')
    console.log(`$(body.submission.trigger_id)`)
    console.log(body)
    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');

    // create Helpdesk ticket
    ticket.create(body.user.id, body.submission);
  } else {
    debug('Token mismatch');
    res.sendStatus(404);
  }
});

// Take an action and be able to submit that action into a thread
app.post('/tse-help', (req, res) => {
  const { type, user, submission, text, trigger_id } = req.body;
 //  const payload = JSON.parse(req.body.payload);
 //  const {type, user, submission} = payload;
  if (!signature.isVerified(req)) {
    res.sendStatus(404);
  return;
  }
  if  (signature.isVerified(req)) {
      const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN,
      trigger_id,
      dialog: JSON.stringify({
        title: 'Submit a helpdesk ticket',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [
                 {
            label: 'Title',
            type: 'text',
            name: 'title',
            value: text,
            hint: '30 second summary of the problem',
          },
          {
            label: 'Description',
            type: 'textarea',
            name: 'description',
            optional: true,
          },
          {
            label: 'Urgency',
            type: 'select',
            name: 'urgency',
            options: [
              { label: 'Low', value: 'Low' },
              { label: 'Medium (Default)', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
        ],
      }),
    };

     axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
     .then((result) => {
      console.log(result)
      console.log('Sending the payload');
      console.log(dialog);
         debug('dialog.open: %o', result.data);
        res.send('');
         //  exportNote.exportToJson(user.id, submission);
    // DM the user a confirmation message
    // confirmation.sendConfirmation(user.id, submission);
	console.log(result.data)

	}).catch((err) => {
        // debug('dialog.open call failed: %o', err);
          res.sendStatus(500);
       });
    // else if (re
    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    // res.send('');
    // create a ClipIt and prepare to export it to the theoritical external app
    // exportNote.exportToJson(user.id, submission);
    // DM the user a confirmation message
    // confirmation.sendConfirmation(user.id, submission);
  }
//	return();

});

const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
