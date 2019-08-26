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

// Attach the adapter to the Express application as a middleware
app.use('/slack/actions', slackInteractions.expressMiddleware());
app.post('/slack/commands', bodyParser.urlencoded({ extended: false }), slackSlashCommand);


slackInteractions.action({ type: 'dialog_submission' }, (payload, respond) => {
  // `payload` is an object that describes the interaction
  console.log(`The user ${payload.user.name} in team ${payload.team.domain} submitted a dialog`);

  // Check the values in `payload.submission` and report any possible errors
  const errors = validateDialog(payload.submission);
  if (errors) {
    return errors;
  } else {
    setTimeout(() => {
      const partialMessage = `<@${payload.submission.user}> just submmited a ticket.`;

      //  are no errors, after this function returns, send an acknowledgement to the user
      respond({
        text: partialMessage,
      });

      // The app does some work using information in the submission
      users.findBySlackId(payload.submission.id)
        // .then(user => user.incrementKudosAndSave(payload.submission.comment))
        .then((user) => {
          // After the asynchronous work is done, call `respond()` with a message object to update
          // the message.
          respond({
            text: `${partialMessage} This ticket will be escalated soon, ${user}! :balloon:`,
            replace_original: true,
          });
        })
        .catch((error) => {
          // Handle errors
          console.error(error);
          respond({ text: 'An error occurred while trying to submit this ticket' });
        });
    });
  }
});

const dialog = {
        title: 'Submit a helpdesk ticket',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [
          {
            label: 'Title',
            type: 'text',
            name: 'title',
            value: 'text',
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
     };

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

function validateDialog(submission) {
  let errors = [];
  if (!submission.description.trim()) {
    errors.push({
      name: 'comment',
      error: 'The description  cannot be empty',
    });
  }
  if (errors.length > 0) {
    return { errors };
  }
}

const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});


