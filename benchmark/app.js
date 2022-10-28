/*
 * Starter Project for WhatsApp Official Connector
 * Meta Developer @ 2022
 * Remix this as the starting point for following the WhatsApp Official Connector
 *
 */

"use strict";

// Access token for your app
// (copy token from DevX getting started page
// and save it as environment variable into the .env file)
const token = process.env.WHATSAPP_TOKEN;

// Imports dependencies and set up http server
const request = require("request"),
  express = require("express"),
  body_parser = require("body-parser"),
  axios = require("axios").default,
  app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log("webhook is listening"));

// Accepts POST requests at /webhook endpoint
app.post("/webhook", async (req, res) => {
  // Parse the request body from the POST
  let body = req.body;

  // Check the Incoming webhook message
  // console.log(JSON.stringify(req.body, null, 2));

  // info on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  if (req.body.object) {
    if (
      req.body.entry &&
      req.body.entry[0].changes &&
      req.body.entry[0].changes[0] &&
      req.body.entry[0].changes[0].value.messages &&
      req.body.entry[0].changes[0].value.messages[0]
    ) {
      
      // Inspect message incoming from whatsapp
      // console.log(req.body.entry[0].changes[0].value.messages[0])
      let message_type = req.body.entry[0].changes[0].value.messages[0].type
      let phone_number_id = req.body.entry[0].changes[0].value.metadata.phone_number_id;
      let from = req.body.entry[0].changes[0].value.messages[0].from; // extract the phone number from the webhook payload
      
      // Message Template
      let msg_body
      if (message_type == 'text') {
        msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
      } else if (message_type == 'interactive') {
        let message_interactive_type = req.body.entry[0].changes[0].value.messages[0].interactive.type
        if (message_interactive_type == 'button_reply') {
          msg_body = req.body.entry[0].changes[0].value.messages[0].interactive.button_reply.title;
        } else {
          // if interactive type == 'list_reply'
          msg_body = req.body.entry[0].changes[0].value.messages[0].interactive.list_reply.title;
        }
      } else if (message_type == 'location') {
        msg_body = req.body.entry[0].changes[0].value.messages[0].location;
      } else if (message_type == 'sticker') {
        msg_body = req.body.entry[0].changes[0].value.messages[0].sticker;
      } else if (message_type == 'image') {
        msg_body = req.body.entry[0].changes[0].value.messages[0].image;
      } else if (message_type == 'video') {
        msg_body = req.body.entry[0].changes[0].value.messages[0].video;
      } else if (message_type == 'audio') {
        msg_body = req.body.entry[0].changes[0].value.messages[0].audio;
      } else if (message_type == 'document') {
        msg_body = req.body.entry[0].changes[0].value.messages[0].document;
      } else {
        msg_body = req.body.entry[0].changes[0].value.messages[0].text.body;
      }
      // let msg_body = req.body.entry[0].changes[0].value.messages[0].text.body; // extract the message text from the webhook payload
      
      // Message Endpoints
      let whatsapp_url = "https://graph.facebook.com/v13.0/" + phone_number_id + "/messages?access_token=" + token
      let chatbot_url = "https://eb92-117-20-55-178.ngrok.io" + "/webhooks/whatsapp_meta/webhook"
      
      try {
        // Get bot responses into variable 'bot_responses'
        let bot_response = await axios({
          method: "POST", // Required, HTTP method, a string, e.g. POST, GET
          url: chatbot_url, // Chatbot Engine Endpoints
          // Data Send to Chatbot Engine
          data: {
              "sender": from,
              "message": msg_body,
              "metadata":{}
          },
          headers: { "Content-Type": "application/json" },
        });
        
        // Looping into responses that send by chatbot engine
        let number_response = bot_response.data.length // Get response length
        for (let i = 0; i < number_response; i++) {
          let message_sent = bot_response.data[i]
          console.log(message_sent)
          // Try to send chatbot message[i] to whatsapp endpoint if failed catch the error
          try {
            let send_to_whatsapp
            if ("attachment" in message_sent) {
              let carousel_items = message_sent.attachment.payload.elements
              let carousel_items_length = carousel_items.length
              let carousel_items_button_only = []
              
              // debug
              // carousel_items_length = 5
              
              for (let buttons_carousel_i=0 ; buttons_carousel_i<carousel_items_length; buttons_carousel_i++) {
                let number_of_carousel_buttons = carousel_items[buttons_carousel_i].buttons.length
                for (let buttons_carousel_ii=0 ; buttons_carousel_ii<number_of_carousel_buttons; buttons_carousel_ii++) {
                  let button_item = carousel_items[buttons_carousel_i].buttons[buttons_carousel_ii]
                  let button_item_skeleton = {
                    id: button_item.payload,
                    title: button_item.payload,
                    description: button_item.title
                  }
                  carousel_items_button_only.push(button_item_skeleton)
                }
              }
              console.log(carousel_items_button_only)
              send_to_whatsapp = await axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url: whatsapp_url, 
                data: {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: from,
                type: "interactive",
                interactive: {
                    type: "list",
                    // header: {
                    //   type: "text",
                    //   text: "HEADER_TEXT"
                    // },
                    body: {
                      text: "Silahkan pilih pada menu item berikut"
                    },
                    // footer: {
                    //   text: "FOOTER_TEXT"
                    // },
                    action: {
                      button: "Menu",
                      sections: [
                        {
                          title: "Pilihan:",
                          rows: carousel_items_button_only
                        },
                      ]
                    }
                  }
                },
                headers: { "Content-Type": "application/json" },
              });
            } else if ("buttons" in message_sent) {
              // BOT TEMPLATE FOR INTERACTIVE: QUICK REPLY - START
              
              // Get all buttons and append to button_list variable
              let number_buttons = message_sent.buttons.length
              let buttons_list = []
              for (let button = 0; button < number_buttons; button++) {
                // console.log(message_sent.buttons[button].title)
                let button_i = {
                  type: "reply",
                  reply: {
                    id: message_sent.buttons[button].title,
                    title: message_sent.buttons[button].title
                  }
                }
                buttons_list.push(button_i)
              }
              // console.log(buttons_list)
              let message_n_in_for_buttons = message_sent.text.split('\n\n')
              let message_n_in_for_buttons_length = message_n_in_for_buttons.length
              for (let texts_for_buttons=0; texts_for_buttons<message_n_in_for_buttons_length; texts_for_buttons++) {
                if (texts_for_buttons != message_n_in_for_buttons_length-1 ){
                  send_to_whatsapp = await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url: whatsapp_url,
                    data: {
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: from,
                      type: "text",
                      text: { 
                        preview_url: true,
                        body: message_n_in_for_buttons[texts_for_buttons]
                      },
                    },
                    headers: { "Content-Type": "application/json" },
                  });
                } else {
                  send_to_whatsapp = await axios({
                    method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                    url: whatsapp_url,
                    data: {
                      messaging_product: "whatsapp",
                      recipient_type: "individual",
                      to: from,
                      type: "interactive",
                      interactive: {
                        type: "button",
                        body: { text: message_n_in_for_buttons[texts_for_buttons] },
                        action: {
                          buttons: buttons_list
                        }
                      }
                    },
                    headers: { "Content-Type": "application/json" },
                  });
                }
              }
              // BOT TEMPLATE FOR INTERACTIVE: QUICK REPLY - START
            } else if ('text' in message_sent) {
              // BOT TEMPLATE FOR TEXT - START
              send_to_whatsapp = await axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url: whatsapp_url,
                data: {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: from,
                  type: "text",
                  text: { 
                    preview_url: true,
                    body: message_sent.text
                  },
                },
                headers: { "Content-Type": "application/json" },
              // BOT TEMPLATE FOR TEXT - END
              });
            } else if ("image" in message_sent) {
              // BOT TEMPLATE FOR URL - IMAGE:  - START
              send_to_whatsapp = await axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url: whatsapp_url,
                data: {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: from,
                  type: "image",
                  image: { link: message_sent.image }
                },
                headers: { "Content-Type": "application/json" },
              });
              // BOT TEMPLATE FOR URL - IMAGE:  - END
            } else if ("document" in message_sent) {
              // BOT TEMPLATE FOR URL - DOCUMENT:  - START
              send_to_whatsapp = await axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url: whatsapp_url,
                data: {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: from,
                  type: "document",
                  document: { link: message_sent.document }
                },
                headers: { "Content-Type": "application/json" },
              });
              // BOT TEMPLATE FOR URL - DOCUMENT:  - END
            } else if ("audio" in message_sent) {
              // BOT TEMPLATE FOR URL - AUDIO:  - START
              send_to_whatsapp = await axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url: whatsapp_url,
                data: {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: from,
                  type: "audio",
                  audio: { link: message_sent.audio }
                },
                headers: { "Content-Type": "application/json" },
              });
              // BOT TEMPLATE FOR URL - AUDIO:  - END
            } else if ("video" in message_sent) {
              // BOT TEMPLATE FOR URL - VIDEO:  - START
              send_to_whatsapp = await axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url: whatsapp_url,
                data: {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: from,
                  type: "video",
                  video: { link: message_sent.video }
                },
                headers: { "Content-Type": "application/json" },
              });
              // BOT TEMPLATE FOR URL - VIDEO:  - END
            } else if ("sticker" in message_sent) {
              // BOT TEMPLATE FOR URL - STICKER:  - START
              send_to_whatsapp = await axios({
                method: "POST", // Required, HTTP method, a string, e.g. POST, GET
                url: whatsapp_url,
                data: {
                  messaging_product: "whatsapp",
                  recipient_type: "individual",
                  to: from,
                  type: "sticker",
                  sticker: { link: message_sent.sticker }
                },
                headers: { "Content-Type": "application/json" },
              });
              // BOT TEMPLATE FOR URL - STICKER:  - END
            }
          } catch (error) {
            // console.log(error) // Error log when send message to whatsapp endpoints
            return res.status(500)
          }
        }
      } catch (error) {
        // console.log(error) // Error log when send message to chatbot endpoints
        return res.status(500)
      }
    }
    return res.sendStatus(200);
  } else {
    // Return a '404 Not Found' if event is not from a WhatsApp API
    return res.sendStatus(404);
  }
});

// Accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests 
app.get("/webhook", (req, res) => {
  /**
   * UPDATE YOUR VERIFY TOKEN
   *This will be the Verify Token value when you set up webhook
  **/
  const verify_token = process.env.VERIFY_TOKEN;

  // Parse params from the webhook verification request
  let mode = req.query["hub.mode"];
  let token = req.query["hub.verify_token"];
  let challenge = req.query["hub.challenge"];

  // Check if a token and mode were sent
  if (mode && token) {
    // Check the mode and token sent are correct
    if (mode === "subscribe" && token === verify_token) {
      // Respond with 200 OK and challenge token from the request
      console.log("WEBHOOK_VERIFIED");
      return res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      return res.sendStatus(403);
    }
  }
});