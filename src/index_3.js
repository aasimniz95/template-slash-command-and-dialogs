require('dotenv').config();

const http = require('http');
const express = require('express');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { WebClient } = require('@slack/client');
const { users, neighborhoods } = require('./models');
const axios = require('axios');
const bodyParser = require('body-parser');

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN;

const slackInteractions = createMessageAdapter(slackSigningSecret);

const web = new WebClient(slackAccessToken);

const app = express();

app.post('/slack/commands', bodyParser.urlencoded({ extended: false }), slackSlashCommand);

app.post('/tse-help', (req, res) => {
  // extract the slash command text, and trigger ID from payload
  const { text, trigger_id } = req.body;

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
              { label: 'Medium', value: 'Medium' },
              { label: 'High', value: 'High' },
            ],
          },
        ],
      }),
    };

    // open the dialog by calling dialogs.open method and sending the payload
   // axios.post(`${apiUrl}/dialog.open`, qs.stringify(dialog))
   //   .then((result) => {
   //     debug('dialog.open: %o', result.data);
   //     res.send('');
   //   }).catch((err) => {
   //     debug('dialog.open call failed: %o', err);
   //     res.sendStatus(500);
   //   });
    slackaSlashCommand 
} else {
    debug('Verification token mismatch');
    res.sendStatus(404);
  }
});





function slackSlashCommand(req, res, next) {
  if (req.body.command === '/tse-help') {
    const type = req.body.text.split(' ')[0];
    if (type === 'button') {
      res.json(interactiveButtons);
    } else if (type === 'menu') {
      res.json(interactiveMenu);
    } else if (type === 'dialog') {
      res.send();
      web.dialog.open({
        trigger_id: req.body.trigger_id,
        dialog,
      }).catch((error) => {
        return axios.post(req.body.response_url, {
          text: `An error occurred while opening the dialog: ${error.message}`,
        });
      }).catch(console.error);
    } else {
      res.send('Use this command followed by `button`, `menu`, or `dialog`.');
    }
  } else {
    next();
  }
}


const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

