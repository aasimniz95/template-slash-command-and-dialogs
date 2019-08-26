require('dotenv').config();

const http = require('http');
const express = require('express');
const { createMessageAdapter } = require('@slack/interactive-messages');
const { WebClient } = require('@slack/client');
const { users, neighborhoods } = require('./models');
const axios = require('axios');
const bodyParser = require('body-parser');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const adapter = new FileSync('db,json');
const db = low(adapter);
const moment = require('moment');

const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
const slackAccessToken = process.env.SLACK_ACCESS_TOKEN;
const slackInteractions = createMessageAdapter(slackSigningSecret);

const web = new WebClient(slackAccessToken);

const app = express();

db.defaults({ tickets: [], threadTs: {}, text: {}, company: {}, location: {}, reportedAt: {}, priority: {}, reportedBy: {} })
  .write()


db.defaults({ reopen: [], messageTs: {}, text: {}, company: {}, location: {}, reportedAt: {}, priority: {}, reportedBy: {} })
  .write()

db.defaults({ closed: [], messageTs: {}, text: {}, company: {}, location: {}, reportedAt: {}, priority: {}, reportedBy: {} })
  .write()

db.defaults({ technical: [], messageTs: {}, title: {}, issue: {}, description: {}, company: {}, location: {}, category: {}, reportedBy: {} })
  .write()

db.defaults({ sales: [], messageTs: {}, title: {}, date: {},  company: {}, location: {}, category: {}, reportedBy: {} })
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


slackInteractions.action('submit-ticket', (payload, respond) => {
   // { type: 'dialog_submission'}	
   // `payload` is an object that describes the interaction
  console.log(`The user ${payload.user.name} in team ${payload.team.domain} submitted a dialog`);
  console.log(payload)
  console.log(payload.actions)
  let date = moment().subtract(7, 'hours');
// write the values of the ticket to the localized dB 
  db.get('tickets')
  .push({ threadTs: `${payload.action_ts}`, text: `${payload.submission.title}`, company: `${payload.submission.companyid}`, location: `${payload.submission.location}`, reportedAt: `${date}`, priority: `${payload.submission.urgency}`, reportedBy: `${payload.user.name}` })
  .write()

  // Check the values in `payload.submission` and report any possible errors
  const errors = validateDialog(payload.submission);
  if (errors) {
    return errors;
  } else if (payload.callback_id === 'submit-ticket'){
    setTimeout(() => {
      const partialMessage = `${payload.user.name} just submmited a ticket.`;
      //let months_arr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct','Nov', 'Dec'];
      // let time = new Date.getTime();
      let date = moment().subtract(7, 'hours');
      let newDate = date.format('MMMM Do YYYY, h:mm a')
      console.log(newDate);
      let local = moment().local();
	console.log(local)
      //let formatDate = date.fomat('TL');
      //console.log(formatDate)
      // let dStr = date.toString();
      //let month = months_arr[date.getMonth()];
      //let day = date.getDate();
      //let hours = date.getHours(); 
      //let minutes = "0" + date.getMinutes();
      //let seconds = "0" + date.getSeconds();
       //let potentialDate = moment().format('l');
       // console.log(potentialDate);
      //let finalDate = month+'-'+day+'-'+year+' '+hours + ':' + minutes.subtr(-2) + ':' +seconds.subtr(-2);
      //let d  = new Date();
      	console.log(date)
	// console.log(dStr)
	//  are no errors, after this function returns, send an acknowledgement to the user
   //   respond({
   //     response_type:'ephemeral',
     //   text: partialMessage,
     // });
	
	let token =  process.env.SLACK_ACCESS_TOKEN
      // The app does some work using information in the submission
     //  users.findBySlackId(payload.submission.id)
        axios.get(`https://slack.com/api/users.info?token=${token}&user=${payload.submission.bug_assignee}&pretty=1`)
	
	// .then(user => user.incrementKudosAndSave(payload.submission.comment))
        //.then((user) => {
        .then(function (user) {  
	// After the asynchronous work is done, call `respond()` with a message object to update
          // the message.
        //  respond({
          //  response_type:'in_channel',
          //  text: `${partialMessage} This ticket will be escalated soon, ${payload.user.name}! :balloon:`,
          //  replace_original: true,
         // });
	respond({
    //"token": process.env.SLACK_ACCESS_TOKEN,
    "text": `*You have a new ticket:*\n${payload.submission.title}`,
    "response_type": "in_channel",	
    "attachments": [
    	{
            "text": `*Description:*\n${payload.submission.description}`
        },
        {
            "text": `*Date Submitted:*\n${newDate}`
        },
        {
            "text": `*ReTool Link:*\nhttps://retool.envoy.christmas/apps/Account%20%26%20User%20Explorer/Company#companyID=${payload.submission.companyid}`
        },
        {
            "text": `*Location ID:*\n${payload.submission.location}`
        },
        {
            "text": `*Reported By:*\n${payload.user.name}`
        },
        {
            "text": `*Urgency:*\n${payload.submission.urgency}`
        },
        {
            "text": `*Completed Status*:\n Open`,
            "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "callback_id": "qa_selection",
            "actions": [
                  {
                        "name": "qa_otion",
                        "text": "Reopen or Close QA Ticket",
                        "type": "select",
                        "options": [
                            {
                                "text": "Reopen",
                                "value": "reopen"
                            },
                            {
                                "text": "Close",
                                "value": "close"
                            }
                        ]
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
  }  // else if (payload.callback_id === 'sales-ticket'){
    //setTimeout(() => {
     // const partialMessage = `${payload.user.name} just submmited a sales ticket.`;

      //  are no errors, after this function returns, send an acknowledgement to the user
     // respond({
       // response_type:'ephemeral',
      //  text: partialMessage,
     // });

      // The app does some work using information in the submission
     // users.findBySlackId(payload.submission.id)
        // .then(user => user.incrementKudosAndSave(payload.submission.comment))
       // .then((user) => {
          // After the asynchronous work is done, call `respond()` with a message object to update
          // the message.
        //  respond({
         //   response_type:'in_channel',
         //   text: `${partialMessage} This sales ticket will be escalated shortly, ${payload.user.name}! :balloon:`,
         //   replace_original: true,
         //  });
	 //  respond({
	// text: `You have a new sales ticket:`,
	//  response: 'in_channel',
	// attachments: [
	 //				{
	//					"type": "section",
	//					"fields": [
	//						{
	//							"type": "mrkdwn",
	//							"text": `*Description:*`
	//						},
	//						{
	//							"type": "mrkdwn",
	//							"text": `*Date Submitted:*`
	//						},
	//						{
	//							"type": "mrkdwn",
	//							"text": `*Last Update:*`
	//						},
	//						{
	//						"type": "mrkdwn",
	//							"text": `*ReTool Link:*\nhttps://retool.envoy.christmas/apps/Account%20%26%20User%20Explorer/Company#companyID=`
	//						},
	//						{
	//							"type": "mrkdwn",
	//							"text": `*Location:*`
	//						},
	//						{
	///							"type": "mrkdwn",
	//							"text": `*Reported By:*`
	//						},
	//						{
	//							"type": "mrkdwn",
	//							"text": `*Urgency:*`	
	//						}
	//					]
	//				}
	//			]
	//		})
       // })
        //.catch((error) => {
          // Handle errors
         // console.error(error);
          //respond({ text: 'An error occurred while trying to submit this ticket' });
       // });
   // });
 // }
});


// Slack interactive message handlers
/* slackInteractions.action('details-call', (payload, respond) => {
  console.log(`The user ${payload.user.name} in team ${payload.team.domain} requested a call`);

  // Use the data model to persist the action
  users.findBySlackId(payload.user.id)
    .then(user => user.setPolicyAgreementAndSave(payload.actions[0].value === 'accept'))
    .then((user) => {
      // After the asynchronous work is done, call `respond()` with a message object to update the
      // message.
      let confirmation;
      if (payload.actions[0].value === 'accept') {
        confirmation = 'Thank you for agreeing to add call details, please see our calendar here (https://calendly.com/tseassistance/30min).';
      } else {
        confirmation = 'You have denied adding details. You will not be able to add a TSE to the call.';
      }
    //  respond({ text: confirmation });
      // respond(sales_dialog)
    //	respond(interactiveMenu)
	})
    .catch((error) => {
      // Handle errors
      console.error(error);
      respond({
         "text": 'An error occurred while trying to get you access to a TSE.'
       });
      // res.send(sales_dialog)
    });

  // Before the work completes, return a message object that is the same as the original but with
  // the interactive elements removed.
  const reply = payload.originalMessage;
  delete reply
  return salesDialog;
}); */

/*slackInteractions.action('details_call', (payload, respond) => {
  console.log(`The user ${payload.user.name} in team ${payload.team.domain} requested a call`);
	console.log(payload)
  // Use the data model to persist the action
  //users.findBySlackId(payload.user.id)
    //.then(user => user.setPolicyAgreementAndSave(payload.actions[0].value === 'accept'))
    //.then((user) => {
      // After the asynchronous work is done, call `respond()` with a message object to update the
      // message.
	//let token =  process.env.SLACK_ACCESS_TOKEN
      // The app does some work using information in the submission
     //  users.findBySlackId(payload.submission.id)
       // axios.get(`https://slack.com/api/users.info?token=${token}&user=${payload.user.name}&pretty=1`)
        
        // .then(user => user.incrementKudosAndSave(payload.submission.comment))
        //.then((user) => {
        //.then(function (req, res) {  

      let dialog = {
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


      if (payload.actions[0].value === 'accept') {
       setTimeout(() => {
	let token =  process.env.SLACK_ACCESS_TOKEN
	// res.send();
       axios.post(`https://slack.com/api/users.info?token=${token}&user=${payload.user.name}&pretty=1`)
	.then(function (req, res) {
	web.dialog.open({
        token: process.env.SLACK_ACCESS_TOKEN,
	trigger_id: payload.original_message.trigger_id,
        dialog,
        })
	}).catch((error) => {
          // Handle errors
          console.error(error);
          respond({ text: 'An error occurred while trying to submit this ticket' });
    	})
       })
     } else if (payload.actions[0].value === 'deny'){
        confirmation = 'You must be asking about a technical configuration.';
      }
    //  respond({ text: confirmation });
     //  respond(sales_dialog)
    //  respond(interactiveMenu)
	//    .catch((error) => {
      // Handle errors
     // console.error(error);
     // respond({
       //  text: 'An error occurred while trying to get you access to a TSE.'
     //  });
      // res.send(sales_dialog)
   // });

  // Before the work completes, return a message object that is the same as the original but with
  // the interactive elements removed.
  //const reply = payload.original_message;
  //delete reply.attachments[0].actions;
  const reply = payload.original_message
  return reply;
}); */

slackInteractions.action('sales-ticket', (payload, respond) => {
//console.log(payload)
let date = moment().subtract(7, 'hours');
db.get('sales')
  .push({ threadTs: `${payload.action_ts}`, text: `${payload.submission.title}`, company: `${payload.submission.company}`, location: `${payload.submission.location}`, date: `${date}`, category: `${payload.submission.category}`,  reportedBy: `${payload.user.name}` }) 
  .write()

 
setTimeout(() => {
let userID = payload.user.name 
let title = payload.submission.title
let date  = payload.submission.date
let company = payload.submission.company
let location = payload.submission.location
let business = payload.submission.category
let token =  process.env.SLACK_ACCESS_TOKEN
      // The app does some work using information in the submission
     //  users.findBySlackId(payload.submission.id)
        axios.get(`https://slack.com/api/users.info?token=${token}&user=${payload.submission.bug_assignee}&pretty=1`)
        
        // .then(user => user.incrementKudosAndSave(payload.submission.comment))
        //.then((user) => {
        .then(function (user) {  


respond({

 "text": `*The following sales ticket has been submitted :*\n`,
         "response_type": "in_channel",
        "attachments": [
        {   
            "text": `*Title*\n${title}`
        },
        {   
            "text": `*Date*\n${date}`
        },
        {   
            "text": `*Company*\nhttps://retool.envoy.christmas/apps/Account%20%26%20User%20Explorer/Company#companyID=${company}`
        },
        {   
            "text": `*Location*\n ${location}`
        },
        {   
            "text": `*Business Type*\n${business}`
        },
        {   
            "text": `*Submitted By*\n${userID}`
        }
      ]
   })
 }).catch((error) => {
          // Handle errors
          console.error(error);
          respond({ text: 'An error occurred while trying to submit this ticket' });
        });
    })
});


slackInteractions.action('tech-ticket', (payload, respond) => {

//console.log(payload)
db.get('technical')
  .push({ threadTs: `${payload.action_ts}`, text: `${payload.submission.title}`, issue: `${payload.submission.issue}`, company: `${payload.submission.company}`, location: `${payload.submission.location}`, description: `${payload.submission.description}`, category: `${payload.submission.category}`,  reportedBy: `${payload.user.name}`})
  .write()
 
setTimeout(() => {
let userID = payload.user.name 
let title = payload.submission.title
let description  = payload.submission.description
let company = payload.submission.company
let location = payload.submission.location
let business = payload.submission.category
let issue = payload.submission.issue

let token =  process.env.SLACK_ACCESS_TOKEN
      // The app does some work using information in the submission
     //  users.findBySlackId(payload.submission.id)
        axios.get(`https://slack.com/api/users.info?token=${token}&user=${payload.submission.bug_assignee}&pretty=1`)
        
        // .then(user => user.incrementKudosAndSave(payload.submission.comment))
        //.then((user) => {
        .then(function (user) {  


respond({

 "text": `*The following technical ticket has been submitted :*\n`,
         "response_type": "in_channel",
        "attachments": [
        {   
            "text": `*Title*\n${title}`
        },  
        {   
            "text": `*Description*\n${description}`
        },  
        {   
            "text": `*Company*\nhttps://retool.envoy.christmas/apps/Account%20%26%20User%20Explorer/Company#companyID=${company}`
        },  
        {   
            "text": `*Location*\n ${location}`
        },  
        {   
            "text": `*Business Type*\n${business}`
        },
	{   
            "text": `*Issue Type*\n${issue}`
        },  
        {   
            "text": `*Submitted By*\n${userID}`
        }
      ]
   })
 }).catch((error) => {
          // Handle errors
          console.error(error);
          respond({ text: 'An error occurred while trying to submit this ticket' });
        });
    })
});

slackInteractions.action('qa_selection', (payload, respond) => {
//console.log(payload.actions[0].selected_options[0]);
//console.log(payload.original_message.attachments[7]);
console.log('this is 8');
console.log(payload.original_message.attachments[8])
//console.log('this is 6');
let token = process.env.SLACK_ACCESS_TOKEN;
console.log('after the submision of the reopen or close')
console.log(payload)
//console.log('the next is the previous entire payload')
//console.log(payload.original_message) 
//console.log('the next thing here is the other part of the payload we need')
//console.log(payload.actions[0])
let userID = payload.actions[0].selected_options[0].value;
console.log(userID)
let  oldValue = payload.original_message.attachments[6];
console.log(payload.original_message.attachments[6])
//axios.get(`https://slack.com/api/chat.update?token=${payload.token}&channel=${payload.channel.id}&text={'This ticket is closed'}&ts=${payload.message_ts}&attachments={payload.original_messaage.attachments}&pretty=1`)
//	.then(function (response) {
//	let reply = payload.original_message.attachments[6].text
//        reply = `*Escalated To*\n ${response.data.user.name}`	
	//console.log(reply);
//})

  let newMessage = payload.original_message;
  // console.log(`${reply}`)
  // newMessage.attachments[6].text = `${reply}`
  // return newMessage
	// an idea here would be to have another selction within reopen to re-assign the issue
	console.log('there is a lot of stuff not coming through')
     console.log(payload.original_message.attachments[0].text)
	console.log('there is a bunch of new attachments that need to be filled')
	console.log(payload.original_message.attachments[1])
	let description =  payload.original_message.attachments[0].text	
	let submission =  payload.original_message.attachments[1].text
	let retool = payload.original_message.attachments[2].text
	let location = payload.original_message.attachments[3].text
	let escalatedBy = payload.original_message.attachments[4].text
	let escalatedTo = payload.original_message.attachments[5].text
	let urgency = payload.original_message.attachments[6].text
  if(userID === 'reopen'){
	 let date = moment().subtract(7, 'hours');

	db.get('reopen')
  	  .push({ messageTs: `${payload.message_ts}`, text: `${description}`, company: `${retool}`, location: `${location}`, reportedAt: `${date}`, priority: `${urgency}`, reportedBy: `${payload.user.name}` })
  	  .write()


	respond({
	 "text": `*The following ticket has been ${userID}ed :*\n`,
    	 "response_type": "in_channel",
	"attachments": [
        {   
            "text": `${description}`
        },
        {   
            "text": `${submission}`
        },
        {   
            "text": `${retool}`
        },
	{
	    "text": `*Reopened By*:\n ${payload.user.name}`
	},
        {   
            "text": `${location}`
        },
        {   
            "text": `${escalatedBy}`
        },
        {   
            "text": `${urgency}`
        },
        {   
            "text": `*Completed Status*: Re-opened`,
            "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "callback_id": "qa_selection",
            "actions": [
                  {
                        "name": "qa_otion",
                        "text": "Close this QA Ticket...",
                        "type": "select",
                        "options": [
                            {   
                                "text": "Close",
                                "value": "close"
                            }
                        ]
                  }
            ]
        }
      ]
    })	
  } else if(userID === 'close'){
//	respond({
	let date = moment().subtract(7, 'hours');

        db.get('closed')
          .push({ messageTs: `${payload.message_ts}`, text: `${description}`, company: `${retool}`, location: `${location}`, reportedAt: `${date}`, priority: `${urgency}`, reportedBy: `${payload.user.name}` })
          .write()
   // "text": `*The status of the ticket above is now closed*\n${payload.original_message.text}`,
   /// "response_type": "in_channel"
    //})
	respond({
    //"token": process.env.SLACK_ACCESS_TOKEN,
    "text":  `*This ticket is now closed*\n`,
    "response_type": "in_channel",      
    "attachments": [
        {   
            "text": `${description}`
        },
        {   
            "text": `${submission}`
        },
        {   
            "text": `${retool}`
        },
        {   
            "text": `${location}`
        },
        {   
            "text": `${escalatedBy}`
        },
        {   
            "text": `${urgency}`
        },
        {   
            "text": `*Completed Status*: Closed`,
            "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "callback_id": "qa_selection",
            "actions": [
                  {
                        "name": "qa_otion",
                        "text": "Click on the button below to re-open the ticket",
                        "type": "select",
                        "options": [
                            {   
                                "text": "Re-open",
                                "value": "reopen"
                            }
                        ]
                  }
            ]
        }
    ]
  })
  } else {
   console.log('This ticket is still open')
}

//('this is 5');
//console.log(payload.original_m
//essage.attachments[5])
//console.log('this is 4');
//console.log(payload.original_message.attachments[4])
//console.log('this is 3');
//console.log(payload.original_message.attachments[3])
//console.log('this is 2');
//console.log(payload.original_message.attachments[2])
//console.log('this is 1');
//console.log(payload.original_message.attachments[1])
})





let dialog = {
        token: process.env.SLACK_ACCESS_TOKEN,
        title: 'Submit a QA ticket',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [
          {
            label: 'Title',
            type: 'text',
            name: 'title',
            hint: '30 second summary of the problem',
          },
          {
            label: 'Description',
            type: 'textarea',
            name: 'description',
            optional: false,
          },
	  {
            label: 'Location ID',
            type: 'text',
            name: 'location',
            optional: true,
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
              { label: 'High (P0)', value: 'High' },
              { label: 'Medium (P1)', value: 'Medium' },
              { label: 'Low (P2)', value: 'Low' },
            ],
          },
        ],
     };

/* const salesDialog = {
        token: process.env.SLACK_ACCESS_TOKEN,
        title: 'Submit a Sales ticket',
        callback_id: 'sales-ticket',
        submit_label: 'Ticket',
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
     }; */



     /*   const interactiveButtons = {
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
      }; */


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
  if (req.body.command === '/bug') {
    const type = req.body.text.split(' ')[0];
    if (type === 'sales') {
	let  dialog = {
        token: process.env.SLACK_ACCESS_TOKEN,
        title: 'Submit a Sales ticket',
        callback_id: 'sales-ticket',
        submit_label: 'Ticket',
        elements: [
          {
            label: 'Details around required call:',
            type: 'textarea',
            name: 'title',
            value: 'text',
            hint: 'Description',
          },
          {
            label: 'Date of Call',
            type: 'text',
            name: 'date',
            value: 'When is your call? (Month Day & Time)',
          },
          {
	   label: 'Company ID',
	   type: 'text',
	   name: 'company',
	   value: 'Enter the Company ID'
	  },
	  { 
           label: 'Location ID (If applicable)',
           type: 'text',
           name: 'location',
           value: 'Enter the Location ID',
	   optional: true,
          },
          {
            label: 'Business Category',
            type: 'select',
            name: 'category',
            options: [
              { label: 'SMB', value: 'SMB' },
              { label: 'MM', value: 'MM' },
              { label: 'ENT', value: 'Enterprise' },
            ],
          },
        ],
     }
     // res.json(interactiveButtons)
     res.send();
     web.dialog.open({
     trigger_id: req.body.trigger_id,
     dialog,
    }).catch((error) => {
	return axios.post(req.body.response_url, {
	text: `An error occurred while opening the dialog: ${error.message}`,
	});
	}).catch(console.error);
     /*if (type === 'sales') {
      res.send();
      web.dialog.open({
        trigger_id: req.body.trigger_id,
        salesDialog,
      })
	//.catch((error) => {
        //return axios.post(req.body.response_url, {
        //  text: `An error occurred while opening the dialog: ${error.message}`,
       // });
     // }).catch(console.error);
    } else if (type === 'tech') {
      res.json(interactiveMenu); */
    } else if (type === 'tech'){
     let  dialog = {
        token: process.env.SLACK_ACCESS_TOKEN,
        title: 'Submit a Tech ticket',
        callback_id: 'tech-ticket',
        submit_label: 'Ticket',
        elements: [
          {
            label: 'Title',
            type: 'text',
            name: 'title',
            value: 'text',
            hint: 'Enter a brief title',
          },
          {
            label: 'Description',
            type: 'textarea',
            name: 'description',
            value: 'Enter a description',
          },
          {
           label: 'Company ID',
           type: 'text',
           name: 'company',
           value: 'Enter the Company ID',
          },
          { 
           label: 'Location ID (If applicable)',
           type: 'text',
           name: 'location',
           value: 'Enter the Location ID',
	   optional: true,
          },
          {
            label: 'Business Category',
            type: 'select',
            name: 'category',
            options: [
              { label: 'SMB', value: 'SMB' },
              { label: 'MM', value: 'MM' },
              { label: 'ENT', value: 'Enterprise' },
            ],
          },
	 {
            label: 'Issue Category',
            type: 'select',
            name: 'issue',   
            options: [
              { label: 'General', value: 'General' },
              { label: 'Security', value: 'Security' },
              { label: 'Integration', value: 'Integration' },
              { label: 'Finance/Account Swap', value: 'Finance'},
	      { label: 'Account Merge', value: 'AccountMerge' },
	      { label: 'Other', value: 'Other' },
	    ],
          },
        ],
     }
     // res.json(interactiveButtons)
     res.send();
     web.dialog.open({
     trigger_id: req.body.trigger_id,
     dialog,
    }).catch((error) => {
        return axios.post(req.body.response_url, {
        text: `An error occurred while opening the dialog: ${error.message}`,
        });
        }).catch(console.error);
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


/*const responsiveMessage = {
    "text": `You have a new ticket:\n*${payload.submission.title}`,
    "response_type": "in_channel",
    "attachments": [
    	{
            "text": `*Description:*\n${payload.submission.description}`
        },
        {
            "text": `*Date Submitted:*\n${date}`
        },
        {
            "text": `*Last Update:*\n`
        },
        {
            "text": `*ReTool Link:*\nhttps://retool.envoy.christmas/apps/Account%20%26%20User%20Explorer/Company#companyID=${payload.submission.companyid}`
        },
        {
            "text": `*Location:*\n${payload.submission.location}`
        },
        {
            "text": `*Reported By:*\n${payload.user}`
        },
        {
            "text": "text": `*Urgency:*\n${payload.submission.urgency}`
        },
        {
            "text": "Here are a few options",
            "fallback": "If you could read this message, you'd be choosing something fun to do right now.",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "callback_id": "qa_selection",
            "actions": [
                  {
                    "name": "qa_list",
                    "text": "Who should this be assigned to?",
                    "type": "select",
                    "data_source": "users"
                  },
                  {
                        "name": "qa_otion",
                        "text": "Reopen or Close this QA Ticket...",
                        "type": "select",
                     //    "options": [
                  //           {
               //                  "text": "ReOpen",
            //                     "value": "reopen"
           //                 },
         //                   {
       //                         "text": "Close",
     //                           "value": "close"
   //                         }
 //                       ]
//                  },
//            ]
//        }
//    ]
//}

*/






const server = app.listen(process.env.PORT || 8080, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

