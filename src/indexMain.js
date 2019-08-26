require('dotenv').config();

const http = require('http');
const express = require('express');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { WebClient } = require('@slack/client');
const { users, neighborhoods } = require('./models');
const axios = require('axios');
const bodyParser = require('body-parser');
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const adapter = new FileSync('db,json')
const db = low(adapter)


const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN;
const slackInteractions = createMessageAdapter(slackSigningSecret);

const web = new WebClient(slackAccessToken);

const app = express();

db.defaults({ tickets: [], threadTs: {}, text: {}, status: {}, company: {}, location: {}, reportedAt: {}, priortiy: {}, links: {}, reportedBy: {}, resolvedBy: {} })
  .write()

//db.defaults({ posts: [], user: {}, count: 0 })
  //.write()

//db.get('tickets')
  //.push({ threadTs: 'example'})

//db.get('posts')
  //.push({ id: 1, title: 'lowdb is awesome'})
  //.write()

//db.set('user.name', 'typicode')
  //.write()

// db.update('count', n => n + 1)
  // .write()

// console.log(db)



// Attach the adapter to the Express application as a middleware
app.use('/slack/actions', slackInteractions.expressMiddleware());
app.post('/slack/commands', bodyParser.urlencoded({ extended: false }), slackSlashCommand);


slackInteractions.action({ type: 'dialog_submission' }, (payload, respond) => {
  // `payload` is an object that describes the interaction
  console.log(`The user ${payload.user.name} in team ${payload.team.domain} submitted a dialog`);
  console.log(payload)
  console.log(payload.actions)
  // Check the values in `payload.submission` and report any possible errors
  const errors = validateDialog(payload.submission);
  if (errors) {
    return errors;
  } else if (payload.callback_id === 'submit-ticket'){
    setTimeout(() => {
      const partialMessage = `${payload.user.name} just submmited a ticket.`;

      //  are no errors, after this function returns, send an acknowledgement to the user
      respond({
        response_type:'ephemeral',
        text: partialMessage,
      });

      // The app does some work using information in the submission
      users.findBySlackId(payload.submission.id)
        // .then(user => user.incrementKudosAndSave(payload.submission.comment))
        .then((user) => {
          // After the asynchronous work is done, call `respond()` with a message object to update
          // the message.
          respond({
            response_type:'in_channel',
            text: `${partialMessage} This ticket will be escalated soon, ${payload.user.name}! :balloon:`,
            replace_original: true,
          });
        })
        .catch((error) => {
          // Handle errors
          console.error(error);
          respond({ text: 'An error occurred while trying to submit this ticket' });
        });
    });
  } else if (payload.callback_id === 'sales-ticket'){
    setTimeout(() => {
      const partialMessage = `${payload.user.name} just submmited a sales ticket.`;

      //  are no errors, after this function returns, send an acknowledgement to the user
      respond({
        response_type:'ephemeral',
        text: partialMessage,
      });

      // The app does some work using information in the submission
      users.findBySlackId(payload.submission.id)
        // .then(user => user.incrementKudosAndSave(payload.submission.comment))
        .then((user) => {
          // After the asynchronous work is done, call `respond()` with a message object to update
          // the message.
        //  respond({
         //   response_type:'in_channel',
         //   text: `${partialMessage} This sales ticket will be escalated shortly, ${payload.user.name}! :balloon:`,
         //   replace_original: true,
         //  });
	   respond({
	text: `You have a new ticket:\n*${payload.submission.title}*`,
	response: 'in_channel',
	attachments: [
					{
						"type": "section",
						"fields": [
							{
								"type": "mrkdwn",
								"text": `*Description:*\n${payload.submission.description}`
							},
							{
								"type": "mrkdwn",
								"text": `*Date Submitted:*\n${date}`
							},
							{
								"type": "mrkdwn",
								"text": `*Last Update:*\n`
							},
							{
								"type": "mrkdwn",
								"text": `*ReTool Link:*\nhttps://retool.envoy.christmas/apps/Account%20%26%20User%20Explorer/Company#companyID=${payload.submission.companyid}`
							},
							{
								"type": "mrkdwn",
								"text": `*Location:*\n${payload.submision.location}`
							},
							{
								"type": "mrkdwn",
								"text": `*Reported By:*\n${payload.user}`
							},
							{
								"type": "mrkdwn",
								"text": `*Urgency:*\n${payload.submision.urgency}`	
							}
						]
					}
				]
			})
        })
        .catch((error) => {
          // Handle errors
          console.error(error);
          respond({ text: 'An error occurred while trying to submit this ticket' });
        });
    });
  }
});


// Slack interactive message handlers
slackInteractions.action('details_call', (payload, respond) => {
  console.log(`The user ${payload.user.name} in team ${payload.team.domain} requested a call`);

  // Use the data model to persist the action
  users.findBySlackId(payload.user.id)
    .then(user => user.setPolicyAgreementAndSave(payload.actions[0].value === 'accept'))
    .then((user) => {
      // After the asynchronous work is done, call `respond()` with a message object to update the
      // message.
      let confirmation;
      if (user.agreedToPolicy) {
        confirmation = 'Thank you for agreeing to add call details, please see our calendar here (https://calendly.com/tseassistance/30min).';
      } else {
        confirmation = 'You have denied adding details. You will not be able to add a TSE to the call.';
      }
    //  respond({ text: confirmation });
       respond(sales_dialog)
    //	respond(interactiveMenu)
	})
    .catch((error) => {
      // Handle errors
      console.error(error);
      respond({
         text: 'An error occurred while trying to get you access to a TSE.'
       });
      // res.send(sales_dialog)
    });

  // Before the work completes, return a message object that is the same as the original but with
  // the interactive elements removed.
  const reply = payload.original_message;
  delete reply.attachments[0].actions;
  return reply;
});


const dialog = {
        token: process.env.SLACK_ACCESS_TOKEN,
        title: 'Submit a QA ticket',
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
            label: 'Location',
            type: 'text',
            name: 'location',
            optional: false,
          },
          {
            label: 'Company ID',
            type: 'text',
            name: 'companyid',
            optional: false,
          },
          {
            label: 'Urgency',
            type: 'select',
            name: 'urgency',
            options: [
              { label: 'Low (P0)', value: 'Low' },
              { label: 'Medium (P1)', value: 'Medium' },
              { label: 'High (P2)', value: 'High' },
            ],
          },
        ],
     };

const sales_dialog = {
        token: process.env.SLACK_ACCESS_TOKEN,
        title: 'Submit a Sales ticket',
        callback_id: 'sales-ticket',
        submit_label: 'Submit Ticket',
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
              { label: 'Standard (1 day)', value: 'Medium' },
              { label: 'Urgent (Requires Manager Approval)', value: 'High' },
            ],
          },
        ],
     };


        const interactiveButtons = {
          text: 'Trying to include a TSE on a call?',
        response_type: 'in_channel',
        attachments: [{
          text: 'Can you include some details about your call?',
          callback_id: 'details_call',
          actions: [
            {
              name: 'accept_sla',
              text: 'Yes',
              value: 'accept',
              type: 'button',
              style: 'primary',
            },
            {
              name: 'accept_sla',
              text: 'No',
              value: 'deny',
              type: 'button',
              style: 'danger',
            },
          ],
        }],
      };

      const interactiveMenu = {
        text: 'You have a technical request of the TSE team. Let me help escalate this issue to the TSE team',
        response_type: 'in_channel',
        attachments: [{
          text: 'Describe the configuration/integration issue that you are experiencing',
          callback_id: 'pick_issue_here',
          actions: [{
            name: 'Technical Issues',
            text: 'Enter the details of the request',
            type: 'text',
            // data_source: 'external',
          }],
        }],
      };


 function slackSlashCommand(req, res, next) {
  if (req.body.command === '/tse-help') {
    const type = req.body.text.split(' ')[0];
    if (type === 'sales') {
      res.json(interactiveButtons)
    } else if (type === 'tech') {
      res.json(interactiveMenu);
    } else if (type === 'qa') {
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
      res.send('Use this command followed by `sales`, `tech`, or `qa`.');
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

